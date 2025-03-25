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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { NewMessageCommand } from 'src/context/chat-context/message/application/commands/new-message.command';

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
    private readonly commandBus: CommandBus,
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
    const response = await this.queryBus.execute<
      FindNewChatsQuery,
      FindNewChatsUseCaseResponse
    >(new FindNewChatsQuery());
    client.emit('chat_list', response);
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
  ): Promise<{ success: boolean; message: string }> {
    // Para un visitante
    if (client.user.role.includes('visitor')) {
      const { message } = payload.data;
      if (!message) {
        return { success: false, message: 'Faltan parámetros (message)' };
      }
      await this.handleVisitorMessage(client.user.sub, message as string);
      return { success: true, message: 'Mensaje enviado al comercial' };
    }

    // Para un comercial
    const { to, message } = payload.data;
    if (!to || !message) {
      return { success: false, message: 'Faltan parámetros (to, message)' };
    }
    await this.handleCommercialMessage(
      to as string,
      message as string,
      client.user.sub,
    );
    return { success: true, message: 'Mensaje enviado al visitante' };
  }

  /**
   * Lógica cuando un visitante envía un mensaje.
   * Puede ir directamente a un comercial asignado o, si no existe aún, emitirse a todos los comerciales.
   */
  private async handleVisitorMessage(
    visitorId: string,
    text: string,
  ): Promise<void> {
    const { chat } = await this.queryBus.execute<
      FindChatByVisitorQuery,
      FindChatByVisitorQueryResponse
    >(new FindChatByVisitorQuery(visitorId));

    if (!chat) {
      this.logger.error(`No existe Chat para el visitante ${visitorId}`);
      return;
    }

    // Si no hay comercial asignado, se envía a todos
    if (!chat.commercialId) {
      await this.broadcastToAllCommercials(chat.chatId, visitorId, text);
      return;
    }

    // De lo contrario, se envía al comercial específico
    const { socketId } = await this.getSocketByUser.execute({
      userId: chat.commercialId,
    });
    if (!socketId) {
      this.logger.error(
        `No se encontró socket para el comercial ${chat.commercialId}`,
      );
      return;
    }

    // Emitimos y persistimos
    this.emitChatMessage(socketId, text, visitorId);
    await this.saveNewMessage(chat.chatId, visitorId, text);
  }

  /**
   * Lógica cuando un comercial envía un mensaje a un visitante.
   */
  private async handleCommercialMessage(
    visitorId: string,
    text: string,
    commercialId: string,
  ): Promise<void> {
    const { chat } = await this.queryBus.execute<
      FindChatByVisitorQuery,
      FindChatByVisitorQueryResponse
    >(new FindChatByVisitorQuery(visitorId));
    if (!chat) {
      this.logger.error(`No existe Chat para el visitante ${visitorId}`);
      return;
    }
    // Obtenemos el socket del visitante y emitimos el mensaje
    const { socketId } = await this.getSocketByUser.execute({
      userId: visitorId,
    });
    if (!socketId) {
      this.logger.error(`No se encontró socket para el visitante ${visitorId}`);
      return;
    }

    this.emitChatMessage(socketId, text, commercialId);
    await this.saveNewMessage(chat.chatId, commercialId, text);
  }

  /**
   * Envía un mensaje a todos los comerciales disponibles.
   */
  private async broadcastToAllCommercials(
    chatId: string,
    senderId: string,
    text: string,
  ) {
    this.logger.log('Enviando mensaje a todos los comerciales');
    this.emitChatMessage(ConnectionRoleEnum.COMMERCIAL, text, senderId);
    await this.saveNewMessage(chatId, senderId, text);
  }

  /**
   * Emite un 'chat_message' a un socket o a un rol (grupo de sockets) con su respectivo timestamp.
   */
  private emitChatMessage(
    destination: string,
    messageText: string,
    from: string,
  ): void {
    const timestamp = Date.now();
    this.server.to(destination).emit('chat_message', {
      type: 'chat_message',
      data: {
        message: messageText,
        from,
      },
      timestamp,
    });
    this.logger.log(`Mensaje emitido a ${destination}`);
  }

  /**
   * Persiste (guarda) el nuevo mensaje usando el CommandBus.
   */
  private async saveNewMessage(
    chatId: string,
    senderId: string,
    text: string,
    timestamp: number = Date.now(),
  ): Promise<void> {
    await this.commandBus.execute(
      new NewMessageCommand(chatId, senderId, text, new Date(timestamp)),
    );
  }

  /**
   * Métodos extra para emitir a un usuario o rol genérico.
   */
  public async emitEventToUser(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    const { socketId } = await this.getSocketByUser.execute({ userId });
    if (!socketId) {
      this.logger.error(`No se encontró socket para el usuario ${userId}`);
      return;
    }
    this.server.to(socketId).emit(event, data);
  }

  public emitEventToRole(
    role: ConnectionRoleEnum,
    event: string,
    data: any,
  ): void {
    this.server.to(role).emit(event, data);
  }
}
