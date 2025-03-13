import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { AuthenticatedSocket } from '../authenticated-socket';

@Injectable()
export class WsRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true; // Si no se especifican roles, permitir acceso

    const client: Socket = context.switchToWs().getClient();
    const user = (client as AuthenticatedSocket).user;
    if (!user) return false;
    for (const role of user.role) {
      if (requiredRoles.includes(role)) return true;
    }

    return false;
  }
}
