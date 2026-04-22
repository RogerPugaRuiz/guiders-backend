import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth.guard';
import { Roles } from '../roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * @deprecated Usar el decorador @Roles() de `src/context/shared/infrastructure/roles.decorator` en su lugar.
 * Este decorador legado usa SetMetadata('roles', ...) con spread y será eliminado en una futura versión.
 * Migración: reemplazar @RequiredRoles('admin', 'commercial') por @Roles(['admin', 'commercial'])
 */
export const RequiredRoles = (...roles: string[]) =>
  SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  // Cacheado en construcción pero re-leído en cada invocación para ser determinista en tests.
  // Ver canActivate para la lectura real.
  private readonly strictRolesAtBoot: boolean;

  constructor(private readonly reflector: Reflector) {
    this.strictRolesAtBoot = process.env.STRICT_ROLES === 'true';
    this.logger.log(
      `STRICT_ROLES=${this.strictRolesAtBoot} — ${this.strictRolesAtBoot ? 'fail-closed activado' : 'fail-open (legacy)'}`,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    // Re-leer de process.env para mantener comportamiento determinista en tests unitarios
    // (los tests modifican process.env en tiempo de ejecución).
    // En producción este valor es constante, así que el overhead es mínimo.
    const strictRoles = process.env.STRICT_ROLES === 'true';
    // Comprobar si el endpoint está marcado como público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Información del endpoint
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const endpoint = `${request.method} ${request.url}`;

    // Extraer los roles requeridos desde la metadata del handler
    // Intentar primero con el nuevo decorator @Roles() (usando Reflector.createDecorator)
    let requiredRoles = this.reflector.getAllAndOverride<string[]>(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no se encuentra con @Roles, intentar con @RequiredRoles() (legacy)
    if (!requiredRoles || requiredRoles.length === 0) {
      requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      if (strictRoles) {
        this.logger.warn(
          `[${endpoint}] Acceso denegado (fail-closed) — endpoint sin @Roles() ni @Public()`,
        );
        throw new ForbiddenException(
          'Endpoint requiere @Roles() o @Public() explícito',
        );
      }
      // fail-open legacy — solo activo con STRICT_ROLES=false o no definido
      this.logger.debug(
        `[${endpoint}] No se requieren roles específicos - Acceso permitido (fail-open)`,
      );
      return true;
    }

    this.logger.log(
      `[${endpoint}] Verificando roles - Requeridos: [${requiredRoles.join(', ')}] | STRICT_ROLES=${strictRoles}`,
    );

    const user = request.user;

    // Si no hay usuario autenticado y el endpoint requiere roles → 401 (no autenticado)
    if (!user) {
      this.logger.warn(
        `[${endpoint}] ❌ ACCESO DENEGADO - Usuario no autenticado`,
      );
      throw new UnauthorizedException('Autenticación requerida');
    }

    if (!user.roles) {
      this.logger.error(
        `[${endpoint}] ❌ ACCESO DENEGADO - Usuario autenticado pero sin roles`,
      );
      this.logger.error(
        `[${endpoint}] Usuario: ${JSON.stringify({ id: user.id, email: user.email, roles: user.roles })}`,
      );
      throw new ForbiddenException('El usuario no tiene roles asignados');
    }

    // Log de los roles del usuario
    this.logger.log(
      `[${endpoint}] Roles del usuario: [${user.roles.join(', ')}]`,
    );

    // Se valida que el usuario tenga al menos uno de los roles requeridos
    const hasRole = user.roles.some((role: string) =>
      requiredRoles.includes(role),
    );

    if (!hasRole) {
      this.logger.error(
        `[${endpoint}] ❌ ACCESO DENEGADO - Roles insuficientes`,
      );
      this.logger.error(
        `[${endpoint}] Requerido: [${requiredRoles.join(', ')}] | Usuario tiene: [${user.roles.join(', ')}]`,
      );
      this.logger.error(
        `[${endpoint}] Usuario completo: ${JSON.stringify(user)}`,
      );
      throw new ForbiddenException('Acceso denegado. Permisos insuficientes.');
    }

    this.logger.log(
      `[${endpoint}] ✅ Acceso permitido - Usuario tiene rol válido`,
    );

    return true;
  }
}
