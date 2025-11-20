import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth.guard';
import { Roles } from '../roles.decorator';

export const RequiredRoles = (...roles: string[]) =>
  SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
      // Si no se especifica ningún rol, se permite el acceso
      this.logger.debug(
        `[${endpoint}] No se requieren roles específicos - Acceso permitido`,
      );
      return true;
    }

    this.logger.log(
      `[${endpoint}] Verificando roles - Requeridos: [${requiredRoles.join(', ')}]`,
    );

    const user = request.user;

    // Log detallado del usuario
    if (!user) {
      this.logger.error(
        `[${endpoint}] ❌ ACCESO DENEGADO - Usuario no autenticado (request.user es undefined/null)`,
      );
      this.logger.error(
        `[${endpoint}] Headers: ${JSON.stringify(request.headers)}`,
      );
      this.logger.error(
        `[${endpoint}] Cookies: ${JSON.stringify(request.cookies || {})}`,
      );
      throw new ForbiddenException('El usuario no tiene roles asignados');
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
