import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenVerifyService } from '../token-verify.service';
import { AuthenticatedRequest } from './auth.guard';
import { resolveVisitorSessionId } from '../../../visitors-v2/infrastructure/http/visitor-session-cookie.util';
import { VisitorSessionAuthService } from '../services/visitor-session-auth.service';
import { BffSessionAuthService } from '../services/bff-session-auth.service';

/**
 * Guard de autenticación dual que soporta múltiples métodos pero es OBLIGATORIO:
 * 1. JWT Bearer token (misma lógica que AuthGuard)
 * 2. Cookies de sesión BFF conectado con Keycloak ('console_session', 'bff_sess', etc.)
 * 3. Cookie de sesión de visitante V2 ('sid') - opcional según use case
 *
 * A diferencia de OptionalAuthGuard, este guard FALLA si no encuentra
 * autenticación válida por ninguno de los métodos soportados.
 */
@Injectable()
export class DualAuthGuard implements CanActivate {
  private readonly logger = new Logger(DualAuthGuard.name);

  constructor(
    private readonly tokenVerifyService: TokenVerifyService,
    private readonly bffSessionAuthService: BffSessionAuthService,
    @Optional()
    private readonly visitorSessionAuthService?: VisitorSessionAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    this.logger.debug('🔍 DualAuthGuard iniciado - autenticación obligatoria');

    try {
      // Intentar autenticación por JWT Bearer token primero
      if (await this.tryJwtAuth(request)) {
        this.logger.debug('✅ Autenticación exitosa por JWT Bearer token');
        return true;
      }

      // Intentar autenticación por cookies BFF de Keycloak
      if (await this.tryBffSessionAuth(request)) {
        this.logger.debug(
          '✅ Autenticación exitosa por sesión BFF de Keycloak',
        );
        return true;
      }

      // Opcional: Intentar autenticación por cookie de sesión de visitante V2
      // (solo si el servicio está disponible)
      if (
        this.visitorSessionAuthService &&
        (await this.tryVisitorSessionAuth(request))
      ) {
        this.logger.debug(
          '✅ Autenticación exitosa por sesión de visitante V2',
        );
        return true;
      }

      // No se encontró autenticación válida por ningún método
      this.logger.warn('❌ No se encontró autenticación válida');
      throw new UnauthorizedException(
        'Se requiere autenticación válida (JWT Bearer token o cookie de sesión)',
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`💥 Error en autenticación dual: ${error}`);
      throw new UnauthorizedException('Error en el proceso de autenticación');
    }
  }

  /**
   * Intenta autenticar usando JWT Bearer token
   */
  private async tryJwtAuth(request: AuthenticatedRequest): Promise<boolean> {
    try {
      if (!request.headers.authorization) {
        this.logger.debug('No se encontró header Authorization');
        return false;
      }

      const { prefix, token } = this.extractToken(
        String(request.headers.authorization),
      );

      if (prefix !== 'Bearer') {
        this.logger.debug(`Prefijo de token inválido: ${prefix}`);
        return false;
      }

      const { sub, typ, role, username, email, companyId } =
        await this.tokenVerifyService.verifyToken(token);

      if (typ !== 'access') {
        this.logger.debug(`Tipo de token inválido: ${typ}`);
        return false;
      }

      request.user = {
        id: sub,
        roles: role,
        username: (username as string) ?? '',
        email: (email as string) ?? '',
        companyId: (companyId as string) ?? undefined,
      };

      this.logger.debug(
        `JWT auth exitosa: id=${sub}, roles=[${role.join(', ')}]`,
      );

      return true;
    } catch (error) {
      this.logger.debug(`JWT auth falló: ${error}`);
      return false;
    }
  }

  /**
   * Intenta autenticar usando cookies de sesión BFF de Keycloak
   */
  private async tryBffSessionAuth(
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    try {
      const cookieHeader = request.headers.cookie as string | undefined;

      this.logger.debug(
        `BFF session auth: cookie header presente: ${cookieHeader ? 'sí' : 'no'}`,
      );

      if (!cookieHeader) {
        return false;
      }

      // Extraer posibles tokens BFF de las cookies
      const bffTokens =
        this.bffSessionAuthService.extractBffSessionTokens(cookieHeader);

      this.logger.debug(`BFF tokens encontrados: ${bffTokens.length}`);

      if (bffTokens.length === 0) {
        return false;
      }

      // Intentar validar cada token hasta que uno funcione
      for (const token of bffTokens) {
        const bffUserInfo =
          await this.bffSessionAuthService.validateBffSession(token);

        if (bffUserInfo) {
          // Poblar request.user con información del BFF
          request.user = {
            id: bffUserInfo.sub,
            roles: bffUserInfo.roles,
            username: bffUserInfo.email?.split('@')[0] || 'Usuario BFF',
            email: bffUserInfo.email || '',
            companyId: undefined, // BFF no tiene companyId directo
          };

          this.logger.debug(
            `BFF auth exitosa: sub=${bffUserInfo.sub}, roles=[${bffUserInfo.roles.join(', ')}]`,
          );

          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.debug(`BFF session auth falló: ${error}`);
      return false;
    }
  }

  /**
   * Intenta autenticar usando cookie de sesión de visitante V2
   * Solo disponible si VisitorSessionAuthService está inyectado
   */
  private async tryVisitorSessionAuth(
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    try {
      if (!this.visitorSessionAuthService) {
        return false;
      }

      const sessionId = resolveVisitorSessionId(request);

      this.logger.debug(
        `Visitor session ID resuelto: ${sessionId || 'no encontrado'}`,
      );

      if (!sessionId) {
        return false;
      }

      const visitorInfo =
        await this.visitorSessionAuthService.validateSession(sessionId);

      if (!visitorInfo) {
        return false;
      }

      // Poblar request.user con información del visitante
      request.user = {
        id: visitorInfo.visitorId,
        roles: ['visitor'],
        username: visitorInfo.username || 'Visitante',
        email: visitorInfo.email,
        companyId: visitorInfo.tenantId, // TenantId equivale a CompanyId
      };

      this.logger.debug(
        `Visitor session auth exitosa: id=${visitorInfo.visitorId}`,
      );

      return true;
    } catch (error) {
      this.logger.debug(`Visitor session auth falló: ${error}`);
      return false;
    }
  }

  private extractToken(authorization: string): {
    prefix: string;
    token: string;
  } {
    const [prefix, token] = authorization.split(' ');
    return { prefix, token };
  }
}
