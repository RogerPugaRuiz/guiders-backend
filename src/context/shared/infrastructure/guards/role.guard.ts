import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './auth.guard';

export const RequiredRoles = (...roles: string[]) =>
  SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Extraer los roles requeridos desde la metadata del handler
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      // Si no se especifica ningún rol, se permite el acceso
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user || !user.roles) {
      throw new ForbiddenException('El usuario no tiene roles asignados');
    }

    // Se valida que el usuario tenga al menos uno de los roles requeridos
    const hasRole = user.roles.some((role: string) =>
      requiredRoles.includes(role),
    );
    if (!hasRole) {
      throw new ForbiddenException('Acceso denegado: roles insuficientes');
    }

    return true;
  }
}
