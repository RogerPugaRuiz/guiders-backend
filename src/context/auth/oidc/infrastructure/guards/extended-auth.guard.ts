import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';

// Interface extending the existing AuthenticatedRequest to support OIDC users
export interface OidcAuthenticatedRequest extends Request {
  user: {
    id: string;
    roles: string[];
    username: string;
    email?: string;
    companyId?: string;
    provider?: string; // Added to identify OIDC vs JWT users
    oidcAccessToken?: string; // For OIDC users
  };
  headers: Record<string, any>;
}

@Injectable()
export class ExtendedAuthGuard implements CanActivate {
  private readonly logger = new Logger(ExtendedAuthGuard.name);

  constructor(private readonly tokenService: TokenVerifyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<OidcAuthenticatedRequest>();
      
      // Check if the user is already authenticated via OIDC (from passport)
      if (request.user && request.user.provider === 'oidc') {
        this.logger.log('Usuario autenticado via OIDC');
        return true;
      }

      // Fall back to original JWT authentication logic
      if (!request.headers.authorization) {
        throw new UnauthorizedException('No se ha encontrado el token');
      }

      const { prefix, token } = this.extractToken(
        String(request.headers.authorization),
      );

      if (prefix !== 'Bearer') {
        throw new UnauthorizedException('No se permite el tipo de token');
      }

      try {
        const { sub, typ, role, username, email, companyId } =
          await this.tokenService.verifyToken(token);
        
        if (typ !== 'access') {
          throw new UnauthorizedException('Token inválido');
        }

        request.user = {
          id: sub,
          roles: role,
          username: (username as string) ?? '',
          email: (email as string) ?? '',
          companyId: (companyId as string) ?? undefined,
          provider: 'jwt', // Mark as JWT authenticated
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new UnauthorizedException(error.message);
        }
        throw new UnauthorizedException('Acceso no autorizado');
      }
    } catch (error) {
      this.logger.error(`Error en el guard de autenticación extendido: ${error}`);
      throw error;
    }

    return true;
  }

  private extractToken(authorization: string): {
    prefix: string;
    token: string;
  } {
    const [prefix, token] = authorization.split(' ');
    return { prefix, token };
  }
}