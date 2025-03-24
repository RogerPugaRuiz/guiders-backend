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
import { FindChatByVisitorQuery } from 'src/context/chat-context/chat/application/queries/find-chat-by-visitor.query';
import { FindChatByVisitorQueryResponse } from 'src/context/chat-context/chat/application/handlers/find-chat-by-visitor.query-handler';
import { GetSocketByUserUseCase } from '../application/usecases/get-socket-by-user';
import { GetCommercialSocketUseCase } from '../application/usecases/get-comercial-sockets';
import { ConnectionRoleEnum } from '../domain/value-objects/connection-role';
import { ValidationError } from 'src/context/shared/domain/validation.error';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealTimeWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private logger = new Logger('RealTimeWebSocketGateway');

  @WebSocketServer() readonly server: Server;
  constructor(
    private readonly tokenVerifyService: TokenVerifyService,
    private readonly connection: ConnectUseCase,
    private readonly disconnect: DisconnectUseCase,
    private readonly getSocketByUser: GetSocketByUserUseCase,
    private readonly getCommercialSocket: GetCommercialSocketUseCase,
    private readonly queryBus: QueryBus,
  ) {}

  // sendNewChat(chat: {
  //   chatId: string;
  //   commercialId: string | null;
  //   visitorId: string;
  //   status: string;
  //   lastMessage: string | null;
  //   lastMessageAt: Date | null;
  // }): Promise<void> {
  //   if (!chat.commercialId) {
  //     this.server.to(ConnectionRoleEnum.COMMERCIAL).emit('new_chat', chat);
  //     this.logger.log('Sending new chat to all commercials');
  //     return Promise.resolve();
  //   }
  //   this.logger.log(`Sending new chat to commercial ${chat.commercialId}`);
  //   this.server.to(chat.commercialId).emit('new_chat', chat);

  //   return Promise.resolve();
  // }

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
      role.map((r) => this.logger.log(`Role: ${r}`));
      await Promise.all(role.map(async (r) => client.join(r)));
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.error('Unauthorized connection');
        this.server.emit('auth_error', { message: 'invalid token' });
      }
      if (error instanceof ValidationError) {
        this.logger.error('Validation error');
        this.server.emit('auth_error', { message: error.message });
      }
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Desconectado ${client.id}`);
    await this.disconnect.execute({ socketId: client.id });
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('commercial')
  @SubscribeMessage('get_chat_list')
  async handleGetVisitors(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.user.sub} is getting chat list`);
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
      `User ${client.user.sub} is initializing chat with visitor ${data.visitorId}`,
    );
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('visitor', 'commercial')
  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { type: string; data: Record<string, unknown>; timestamp: number },
  ) {
    this.logger.log(`User ${client.user.sub} is sending event ${payload.type}`);

    if (client.user.role.includes('visitor')) {
      const { message } = payload.data;
      if (!message) {
        return Promise.resolve({
          success: false,
          message: 'Missing parameters',
        });
      }

      await this.sendChatMessageToCommercial(
        client.user.sub,
        payload.data.message as string,
      );

      return Promise.resolve({
        success: true,
        message: 'Message sent to commercial',
      });
    } else {
      const { to, message } = payload.data;
      if (!to || !message) {
        return Promise.resolve({
          success: false,
          message: 'Missing parameters',
        });
      }
      await this.sendChatMessageToVisitor(to as string, message as string);

      return Promise.resolve({
        success: true,
        message: 'Message sent to visitor',
      });
    }
  }

  @UseGuards(WsAuthGuard, WsRolesGuard)
  @Roles('visitor', 'commercial')
  @SubscribeMessage('pageview')
  handlePageView(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { type: string; data: Record<string, unknown>; timestamp: number },
  ) {
    this.logger.log(`User ${client.user.sub} is sending event ${payload.type}`);
    this.logger.log(`Payload: ${JSON.stringify(payload)}`);
  }

  private async sendChatMessageToVisitor(
    visitorId: string,
    message: string,
  ): Promise<void> {
    const { chat } = await this.queryBus.execute<
      FindChatByVisitorQuery,
      FindChatByVisitorQueryResponse
    >(new FindChatByVisitorQuery(visitorId));

    if (!chat) {
      this.logger.error(`Chat not found for visitor ${visitorId}`);
      return;
    }
    const { socketId } = await this.getSocketByUser.execute({
      userId: visitorId,
    });
    if (!socketId) {
      this.logger.error(`Socket not found for visitor ${visitorId}`);
      return;
    }
    this.server.to(socketId).emit('chat_message', {
      type: 'chat_message',
      data: { message },
      timestamp: new Date().getTime(),
    });
    this.logger.log(`Message sent to visitor ${visitorId}`);
  }

  private async sendChatMessageToCommercial(
    visitorId: string,
    message: string,
  ) {
    const { chat } = await this.queryBus.execute<
      FindChatByVisitorQuery,
      FindChatByVisitorQueryResponse
    >(new FindChatByVisitorQuery(visitorId));
    if (!chat) {
      this.logger.error(`Chat not found for visitor ${visitorId}`);
      return;
    }
    if (!chat.commercialId) {
      this.broadcastMessageToAllCommercials({
        message,
        from: chat.visitorId,
      });
      return;
    }
    const { socketId } = await this.getSocketByUser.execute({
      userId: chat.commercialId,
    });

    this.broadcastMessageToCommercial(socketId, {
      message,
      from: chat.visitorId,
    });
  }
  public async emitToUser(userId: string, event: string, data: any) {
    const { socketId } = await this.getSocketByUser.execute({ userId });
    if (!socketId) {
      this.logger.error(`Socket not found for user ${userId}`);
      return;
    }
    this.server.to(socketId).emit(event, data);
  }
  public emitToRole(role: ConnectionRoleEnum, event: string, data: any) {
    this.server.to(role).emit(event, data);
  }

  private broadcastMessageToCommercial(
    socketId: string | null,
    payload: { message: string; from: string },
  ) {
    if (!socketId) {
      this.logger.error('Commercial socket not found');
      return;
    }

    const { message, from } = payload;
    // number of milliseconds since 1970/01/01
    const timestamp = new Date().getTime();
    this.server.to(socketId).emit('chat_message', { message, timestamp, from });
    this.logger.log(`Message sent to commercial ${socketId} `);
  }

  private broadcastMessageToAllCommercials(payload: {
    message: string;
    from: string;
  }) {
    const { message, from } = payload;
    const timestamp = new Date().getTime();
    this.logger.log(`Broadcasting message to all commercials`);
    this.server
      .to(ConnectionRoleEnum.COMMERCIAL)
      .emit('chat_message', { message, timestamp, from });
    this.logger.log(`Message sent to all commercials`);
  }
}
