/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { AuthenticatedSocket } from './authenticated-socket';
import { WsRolesGuard } from './guards/ws-role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';

interface VisitorConnection {
  visitorId: string;
  available: boolean;
  disconnected: boolean;
  lastEventTimestamp: number;
}

interface CommercialConnection {
  commercialId: string;
}

interface TabData {
  socketId: string;
  visitorId: string;
  available: boolean;
}

const visitors: Record<string, VisitorConnection> = {};
const socketToVisitor: Record<string, string> = {};
const commercials: Record<string, CommercialConnection> = {};
const socketToCommercial: Record<string, string> = {};
const tabData: Record<string, TabData> = {};

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private logger = new Logger('TrackingGateway');
  @WebSocketServer() private server: Server;

  constructor(private readonly tokenVerifyService: TokenVerifyService) {}

  async onModuleDestroy() {
    await this.server.close();
    Object.keys(visitors).forEach((key) => delete visitors[key]);
    Object.keys(socketToVisitor).forEach((key) => delete socketToVisitor[key]);
    Object.keys(commercials).forEach((key) => delete commercials[key]);
    Object.keys(socketToCommercial).forEach(
      (key) => delete socketToCommercial[key],
    );
  }
  async handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.auth.token as string;
    if (!token) {
      this.logger.warn(
        `Socket ${client.id} desconectado: Token no proporcionado`,
      );
      client.emit('auth_error', { message: 'invalid token' }); // Envía error
      return;
    }
    try {
      const decoded = await this.tokenVerifyService.verifyToken(token);
      const clientID = decoded.sub;
      if (!clientID) throw new UnauthorizedException('Token sin sub válido');

      if (decoded.role.includes('user')) {
        commercials[clientID] = { commercialId: clientID };
        socketToCommercial[client.id] = clientID;
        this.logger.log(
          `Comercial ${clientID} conectado en socket ${client.id}`,
        );
        return;
      }
      if (!visitors[clientID]) {
        visitors[clientID] = {
          visitorId: clientID,
          available: false,
          disconnected: false,
          lastEventTimestamp: Date.now(),
        };

        this.notifyCommercials('visitor_connected', visitors[clientID]);
        this.logger.log(`Visitante ${JSON.stringify(visitors[clientID])}`);
      }
      tabData[client.id] = {
        socketId: client.id,
        available: false,
        visitorId: clientID,
      };
      socketToVisitor[client.id] = clientID;
    } catch (error) {
      this.logger.error(`Error al verificar token: ${error.message}`);
      client.emit('auth_error', { message: 'invalid token' }); // Envía error
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket ${client.id} desconectado`);
    if (socketToVisitor[client.id]) {
      const visitorId = socketToVisitor[client.id];
      delete socketToVisitor[client.id];
      delete tabData[client.id];
      const numberOfVisitorsStillConnected = Object.values(
        socketToVisitor,
      ).filter((id) => id === visitorId).length;
      if (numberOfVisitorsStillConnected === 0) {
        // delete visitors[visitorId];
        this.logger.log(
          `Visitante ${visitorId} desconectado ${JSON.stringify(visitors[visitorId])}`,
        );
        visitors[visitorId].disconnected = false;
        this.notifyCommercials('visitor_disconnected', visitors[visitorId]);
      }
    }
    if (socketToCommercial[client.id]) {
      delete socketToCommercial[client.id];
      this.logger.log(`Comercial ${client.id} desconect`);
    }
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('user')
  @SubscribeMessage('get_visitors')
  handleGetVisitors(client: AuthenticatedSocket) {
    this.logger.log(`Comercial ${client.id} solicita visitantes`);
    const set = new Set(Object.values(visitors));
    this.logger.log(
      `Enviando lista de visitantes: ${JSON.stringify(Object.values(visitors))}`,
    );
    client.emit('visitors_list', Array.from(set));
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('visitor')
  @SubscribeMessage('tracking')
  handleTracking(
    client: AuthenticatedSocket,
    data: { event: string; data: any; timestamp: number },
  ) {
    if (data.event === 'user_status') {
      const visitorId = client.user!.sub;
      const available = data.data.available as boolean;
      tabData[client.id].available = available;
      // show tabData
      this.logger.log(`Tab data: ${JSON.stringify(tabData)}`);
      visitors[visitorId].available = Object.values(tabData).some(
        (tab) => tab.visitorId === visitorId && tab.available,
      );

      this.notifyCommercials('visitor_status', visitors[visitorId]);
    }
  }

  private notifyCommercials(event: string, data: any) {
    Object.keys(socketToCommercial).forEach((commercial) => {
      this.server.to(commercial).emit(event, data);
    });
  }
}
