/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly tokenVerifyService: TokenVerifyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token =
      (client.handshake.auth?.token as string) ||
      (client.data?.token as string);

    if (!token) {
      this.logger.warn('Conexión rechazada: No hay token en el handshake');
      client.emit('auth_error', { message: 'invalid token' }); // Envía error
      return false;
    }

    try {
      const decoded = await this.tokenVerifyService.verifyToken(token);
      (client as any).user = decoded; // Guardar usuario en el socket
      return true;
    } catch (error) {
      this.logger.warn(`Conexión rechazada: ${error.message}`);
      client.emit('auth_error', { message: 'invalid token' }); // Envía error
      return false;
    }
  }
}
