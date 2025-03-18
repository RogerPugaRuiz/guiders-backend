import {
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
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
import { QueryBus } from '@nestjs/cqrs';
import { FindNewChatsQuery } from 'src/context/chat-context/chat/application/queries/find-new-chats.query';
import { FindNewChatsUseCaseResponse } from 'src/context/chat-context/chat/application/usecases/find-new-chats.usecase';
import { ConnectUseCase } from '../application/usecases/connect.usecase';
import { DisconnectUseCase } from '../application/usecases/disconnect.usecase';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealTimeWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private logger = new Logger('RealTimeWebSocketGateway');

  @WebSocketServer() private server: Server;
  constructor(
    private readonly tokenVerifyService: TokenVerifyService,
    private readonly connection: ConnectUseCase,
    private readonly disconnect: DisconnectUseCase,
    private readonly queryBus: QueryBus,
  ) {}

  onModuleDestroy() {
    this.server.removeAllListeners();
  }
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      if (!token) {
        throw new UnauthorizedException();
      }
      const { sub: clientID, role } =
        await this.tokenVerifyService.verifyToken(token);
      await this.connection.execute({
        connectionId: clientID,
        role: role.includes('visitor') ? 'visitor' : 'commercial',
        socketId: client.id,
      });
      this.logger.log(`Conectado ${client.id}`);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.error('Unauthorized connection');
        this.server.emit('auth_error', { message: 'invalid token' });
      }
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Desconectado ${client.id}`);
    await this.disconnect.execute({ socketId: client.id });
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('user')
  @SubscribeMessage('get_chat_list')
  async handleGetVisitors(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.user?.sub} is getting chat list`);
    // this.logger.log(`Chats: ${JSON.stringify(chats)}`);
    const chats = await this.queryBus.execute<
      FindNewChatsQuery,
      FindNewChatsUseCaseResponse
    >(new FindNewChatsQuery());
    client.emit('chat_list', chats);
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('visitor')
  @SubscribeMessage('init_chat')
  handleInitChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { visitorId: string },
  ) {
    this.logger.log(
      `User ${client.user?.sub} is initializing chat with visitor ${data.visitorId}`,
    );
  }
}
