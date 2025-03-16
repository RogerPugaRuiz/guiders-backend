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
import { ConnectUserToSocketUseCase } from '../application/connect-user-to-socket.usecase';
import { DisconnectUserToSocketUseCase } from '../application/disconnect-user-to-socket.usecase';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealTimeWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private logger = new Logger('RealTimeWebSocketGateway');
  @WebSocketServer() private server: Server;
  constructor(
    private readonly connectUserToSocketUseCase: ConnectUserToSocketUseCase,
    private readonly disconnectUserToSocketUseCase: DisconnectUserToSocketUseCase,
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

      await this.connectUserToSocketUseCase.execute({
        userId: clientID,
        socketId: client.id,
      });

      this.logger.log(`Conectado ${clientID}`);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.error('Unauthorized connection');
        this.server.emit('auth_error', { message: 'invalid token' });
      }
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Desconectado ${client.id}`);
    await this.disconnectUserToSocketUseCase.execute(client.id);
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('user')
  @SubscribeMessage('get_chat_list')
  handleGetVisitors(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.user?.sub} is getting chat list`);
    client.emit('chat_list', { message: 'chat list' });
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('visitor')
  @SubscribeMessage('chat_status')
  handleTracking(
    client: AuthenticatedSocket,
    data: { status: 'active' | 'inactive' },
  ) {
    this.logger.log(`User ${client.user?.sub} is ${data.status}`);
  }
}
