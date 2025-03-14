import {
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectedSocket,
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
import { UserConnectionService } from './user-connection.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private logger = new Logger('TrackingGateway');
  @WebSocketServer() private server: Server;
  constructor(
    private readonly userConnectionService: UserConnectionService,
    private readonly tokenVerifyService: TokenVerifyService,
  ) {}

  async onModuleDestroy() {}
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      if (!token) {
        throw new UnauthorizedException();
      }
      const { sub: clientID } =
        await this.tokenVerifyService.verifyToken(token);
      this.logger.log(`Conectado ${clientID}`);
      this.userConnectionService.add(clientID, client.id);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.error('Unauthorized connection');
        this.server.emit('auth_error', { message: 'invalid token' });
      }
    }
  }

  handleDisconnect(client: Socket) {}

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('user')
  @SubscribeMessage('get_visitors')
  handleGetVisitors(client: AuthenticatedSocket) {}

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('visitor')
  @SubscribeMessage('user_status')
  handleTracking(
    client: AuthenticatedSocket,
    data: { status: 'active' | 'inactive' },
  ) {
    this.logger.log(`User ${client.user?.sub} is ${data.status}`);
  }
}
