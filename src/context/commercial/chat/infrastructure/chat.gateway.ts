/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Logger, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { AuthenticatedSocket } from './authenticated-socket';
import { WsRolesGuard } from './guards/ws-role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';

interface VisitorInfo {
  clientId: string;
  sockets: string[];
}

interface CommercialInfo {
  commercialId: string;
  socketId: string;
}

const visitors: Record<string, VisitorInfo> = {};
const commercials: Record<string, CommercialInfo> = {};

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger('ChatGateway');

  constructor(private readonly tokenVerifyService: TokenVerifyService) { }

  @WebSocketServer()
  private server: Server;

  /**
   * Maneja la conexión de un nuevo cliente.
   */
  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Cliente conectado: ${client.id}`);

    const token = client.handshake.auth.token as string;

    if (!token) {
      this.logger.warn(
        `Cliente ${client.id} desconectado: Token no proporcionado`,
      );
      client.disconnect();
      return;
    }

    try {
      const decoded = await this.tokenVerifyService.verifyToken(token);

      const visitorId = decoded.sub; // ID del visitante (clientId o sub)
      if (!visitorId) {
        throw new UnauthorizedException('Token sin clientId válido');
      }
      const role = decoded.role;
      if (role.includes('user')) {
        commercials[client.id] = {
          commercialId: visitorId,
          socketId: client.id,
        };
        this.logger.log(`Comercial ${visitorId} conectado`);
        return;
      }

      if (visitors[visitorId]) {
        if (!visitors[visitorId].sockets.includes(client.id)) {
          visitors[visitorId].sockets.push(client.id);
        }
      } else {
        visitors[visitorId] = {
          clientId: visitorId,
          sockets: [client.id],
        };
      }

      // Notificar a los comerciales sobre el nuevo visitante
      this.notifyCommercials('visitor_connected', visitors[visitorId]);
    } catch (error) {
      this.logger.error(`Error al verificar token: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Maneja la desconexión de un cliente.
   */
  async handleDisconnect(client: Socket) {
    const token = client.handshake.auth.token as string;
    if (!token) {
      this.logger.warn(
        `Cliente ${client.id} desconectado: Token no proporcionado`,
      );
      return;
    }
    try {
      const decoded = await this.tokenVerifyService.verifyToken(token);
      if (decoded.role.includes('user')) return;
      const visitorInfo = visitors[decoded.sub];

      if (visitorInfo) {
        visitors[decoded.sub].sockets = visitors[decoded.sub].sockets.filter(
          (socket) => socket !== client.id,
        );

        if (visitors[decoded.sub].sockets.length === 0) {
          delete visitors[decoded.sub];
        }

        this.notifyCommercials('visitor_disconnected', visitorInfo);
        this.logger.log(`Visitante ${visitorInfo.clientId} desconectado`);
      }
    } catch (error) {
      this.logger.error(`Error al verificar token: ${error.message}`);
    }
  }

  /**
   * Mostrar lista de visitantes conectados a un comercial.
   */
  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('user')
  @SubscribeMessage('get_visitors')
  handleGetVisitors(client: AuthenticatedSocket) {
    this.logger.log(`Comercial ${client.id} solicitando visitantes`);
    client.emit('visitors_list', Object.values(visitors));
  }

  /**
   * Notificar solo a los comerciales
   */
  private notifyCommercials(event: string, data: any) {
    Object.values(commercials).forEach((commercial) => {
      this.server.to(commercial.socketId).emit(event, data);
    });
  }
}
