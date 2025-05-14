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
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenVerifyService } from '../../shared/infrastructure/token-verify.service';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { AuthenticatedSocket } from './authenticated-socket';
import { WsRolesGuard } from './guards/ws-role.guard';
import { Roles } from 'src/context/shared/infrastructure/roles.decorator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ValidationError } from 'src/context/shared/domain/validation.error';
import { ConnectUserCommand } from '../application/command/connect/connect-user.command';
import { FindOneUserBySocketIdQuery } from '../application/query/find-one/find-one-user-by-socket-id.query';
import { FindOneUserBySocketIdQueryResult } from '../application/query/find-one/find-one-user-by-socket-id.query-handler';
import { DisconnectUserCommand } from '../application/command/disconnect/disconnect-user.command';
import { RealTimeMessageSenderCommand } from 'src/context/real-time/application/command/message/real-time-message-sender.command';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { FindChatListByParticipantQuery } from 'src/context/conversations/chat/application/read/find-chat-list-by-participant.query';
import { StartChatCommand } from 'src/context/conversations/chat/application/create/pending/start-chat.command';
import { ConnectionUser } from '../domain/connection-user';
import { ParticipantUnseenChatCommand } from 'src/context/conversations/chat/application/update/participants/unseen-chat/participant-unseen-chat.command';
import { ParticipantSeenChatCommand } from 'src/context/conversations/chat/application/update/participants/seen-chat/participant-seen-chat.command';
import { ChatPrimitives } from 'src/context/conversations/chat/domain/chat/chat';
import { CreateTrackingEventCommand } from 'src/context/tracking/application/commands/create-tracking-event.command';

export interface Event {
  type?: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ErrorResponse {
  error: string;
  timestamp: number;
}

export interface SuccessResponse<T extends Record<string, unknown>> {
  type: string;
  message: string;
  timestamp: number;
  data: T;
}

export type Response<T extends Record<string, unknown>> =
  | ErrorResponse
  | SuccessResponse<T>;

export class ResponseBuilder<T extends Record<string, unknown>> {
  private success: boolean = true;
  private message: string = 'Operación exitosa';
  private data: T = {} as T;
  private type: string = 'notification';

  static create<T extends Record<string, unknown>>(): ResponseBuilder<T> {
    return new ResponseBuilder<T>();
  }

  addSuccess(success: boolean): this {
    this.success = success;
    return this;
  }

  addMessage(message: string): this {
    this.message = message;
    return this;
  }

  addData(data: T): this {
    this.data = data;
    return this;
  }

  addType(type: string): this {
    this.type = type;
    return this;
  }

  build(): SuccessResponse<T> | ErrorResponse {
    const timestamp = Date.now();
    if (this.success) {
      return {
        type: this.type,
        message: this.message,
        timestamp,
        data: this.data,
      };
    }
    return {
      error: this.message,
      timestamp,
    };
  }
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealTimeWebSocketGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy,
    OnGatewayInit
{
  private logger = new Logger('RealTimeWebSocketGateway');
  @WebSocketServer() server: Server;
  private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Almacena los timeouts de desconexión por usuario

  afterInit(server: Server) {
    this.server = server;
  }

  constructor(
    private readonly tokenVerifyService: TokenVerifyService,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  onModuleDestroy() {
    if (this.server) {
      this.server.removeAllListeners();
    }
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      if (!token) {
        throw new UnauthorizedException();
      }
      const socketId = client.id;
      const { sub: connectionId, role: roles } =
        await this.tokenVerifyService.verifyToken(token);

      // Si existe un timeout de desconexión pendiente para este usuario, lo cancelamos
      if (this.disconnectTimeouts.has(connectionId)) {
        clearTimeout(this.disconnectTimeouts.get(connectionId));
        this.disconnectTimeouts.delete(connectionId);
        this.logger.log(
          `Cancelado periodo de gracia de desconexión para usuario ${connectionId}`,
        );
      }

      await this.commandBus.execute(
        new ConnectUserCommand(connectionId, roles, socketId),
      );

      await Promise.all(roles.map(async (r) => client.join(r)));
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.error('Unauthorized connection');
        this.server.emit('auth_error', {
          message: 'invalid token',
          token: client.handshake.auth.token as string,
        });
      }
      if (error instanceof ValidationError) {
        this.logger.error('Validation error');
        this.server.emit('auth_error', { message: error.message });
      }
    }
  }

  async handleDisconnect(client: Socket) {
    const socketId = client.id;
    const { user } = await this.queryBus.execute<
      FindOneUserBySocketIdQuery,
      FindOneUserBySocketIdQueryResult
    >(new FindOneUserBySocketIdQuery(socketId));
    if (user) {
      // Iniciamos un periodo de gracia de 3 segundos antes de desconectar al usuario
      const timeout = setTimeout(() => {
        // Lógica async dentro de una función normal usando then
        this.commandBus
          .execute(new DisconnectUserCommand(user.userId))
          .then(() => {
            this.disconnectTimeouts.delete(user.userId);
            this.logger.log(
              `Usuario ${user.userId} desconectado tras periodo de gracia`,
            );
          })
          .catch((error) => {
            if (error instanceof Error) {
              this.logger.error(
                `Error al desconectar al usuario ${user.userId}: ${error.message}`,
              );
            }
          });
      }, 3000);
      this.disconnectTimeouts.set(user.userId, timeout);
      this.logger.log(`Periodo de gracia iniciado para usuario ${user.userId}`);
    }
  }

  sendNotificationToParticipants(params: {
    participants: ConnectionUser[];
    notificationType?: 'error' | 'success';
    message?: string;
    data?: Record<string, unknown>;
  }) {
    const {
      participants,
      notificationType = 'success',
      message = 'Operación exitosa',
      data = {},
    } = params;

    if (!participants || participants.length === 0) {
      this.logger.warn('No participants to send notification');
      return;
    }

    if (!this.server) {
      this.logger.error('Socket server not set');
      return;
    }

    const response = ResponseBuilder.create()
      .addType(notificationType)
      .addMessage(message)
      .addData(data)
      .build();

    participants.forEach((participant) => {
      if (participant.isConnected()) {
        this.server
          .to(participant.socketId.get().value)
          .emit('notification', response);
      }
    });
  }

  sendNotification(
    payload: Record<string, unknown>,
    recipientId: string,
    type?: string,
  ) {
    if (!this.server) {
      this.logger.error('Socket server not set');
      return;
    }
    this.server.to(recipientId).emit(
      type || 'notification',
      ResponseBuilder.create()
        .addData(payload)
        .addType(type || 'notification')
        .build(),
    );
  }

  @SubscribeMessage('test')
  handleTest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    this.logger.log(`User ${client.user.sub} is sending test message`);
    return Promise.resolve(
      ResponseBuilder.create()
        .addMessage('Test message received')
        .addData(event.data)
        .addType('test')
        .build(),
    );
  }

  @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('visitor:send-message')
  async handleVisitorSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    const { id, message, timestamp, chatId } = event.data as {
      id: string;
      message: string;
      timestamp: number;
      chatId: string;
    };

    const command = new RealTimeMessageSenderCommand(
      id,
      chatId,
      client.user.sub,
      message,
      new Date(timestamp),
    );

    const result = await this.commandBus.execute<
      RealTimeMessageSenderCommand,
      Result<void, DomainError>
    >(command);

    if (result.isErr()) {
      return Promise.resolve(
        ResponseBuilder.create()
          .addSuccess(false)
          .addMessage(result.error.message)
          .build(),
      );
    }

    return Promise.resolve(
      ResponseBuilder.create()
        .addMessage('Mensaje enviado al comercial')
        .build(),
    );
  }

  @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('visitor:start-chat')
  async handleStartChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    const { chatId } = event.data as {
      chatId: string;
    };
    const participantId = client.user.sub;
    const visitorName = client.user.email || client.user.sub;
    const command = new StartChatCommand(chatId, participantId, visitorName);
    await this.commandBus.execute<StartChatCommand, void>(command);
    return Promise.resolve(
      ResponseBuilder.create()
        .addMessage('Chat started')
        .addData(event.data)
        .build(),
    );
  }

  @Roles(['commercial'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('commercial:notifications')
  handleCommercialNotification(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    return ResponseBuilder.create()
      .addMessage('Notificación recibida')
      .addData(event.data)
      .build();
  }

  @Roles(['commercial'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('commercial:send-message')
  async handleCommercialSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    const { id, message, timestamp, chatId } = event.data as {
      id: string;
      message: string;
      timestamp: number;
      chatId: string;
    };
    this.logger.log(
      `User ${client.user.sub} is sending message to visitor: ${message}`,
    );

    const command = new RealTimeMessageSenderCommand(
      id,
      chatId,
      client.user.sub,
      message,
      new Date(timestamp),
    );
    const result = await this.commandBus.execute<
      RealTimeMessageSenderCommand,
      Result<void, DomainError>
    >(command);
    if (result.isErr()) {
      return Promise.resolve(
        ResponseBuilder.create()
          .addSuccess(false)
          .addMessage(result.error.message)
          .build(),
      );
    }
    this.logger.log(
      `User ${client.user.sub} has sent message to visitor: ${message}`,
    );
    return Promise.resolve(
      ResponseBuilder.create()
        .addSuccess(true)
        .addMessage('Mensaje enviado al visitante')
        .addData({
          message,
        })
        .build(),
    );
  }

  @Roles(['commercial'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('commercial:get-chats')
  async handleGetCommercialChats(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.user.sub} is getting chat list`);

    const response = await this.queryBus.execute<
      FindChatListByParticipantQuery,
      { chats: ChatPrimitives[] }
    >(new FindChatListByParticipantQuery(client.user.sub));
    return Promise.resolve(
      ResponseBuilder.create()
        .addSuccess(true)
        .addMessage('Chats obtenidos')
        .addData(response)
        .build(),
    );
  }

  @Roles(['commercial'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('commercial:get-visitors')
  async handleGetCommercialVisitors(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ): Promise<
    Response<{
      items: any[];
      total: number;
      hasMore: boolean;
      nextCursor: string | null;
    }>
  > {
    this.logger.log(event.data);
    const { limit, cursor } = event.data as {
      limit: number;
      cursor: string | null;
    };
    return Promise.resolve(
      ResponseBuilder.create<{
        items: any[];
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
      }>()
        .addSuccess(true)
        .addMessage('Visitors obtenidos')
        .addData({
          items: [],
          total: 0,
          hasMore: false,
          nextCursor: null,
        })
        .build(),
    );
  }

  @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('visitor:open-chat')
  async handleVisitorOpenChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ): Promise<Response<{ chatId: string; timestamp: number }>> {
    const { chatId, timestamp } = event.data as {
      chatId: string;
      timestamp: number;
    };

    const command = new ParticipantSeenChatCommand({
      chatId,
      participantId: client.user.sub,
      seenAt: new Date(timestamp),
    });

    await this.commandBus.execute<ParticipantSeenChatCommand, void>(command);

    return new ResponseBuilder<any>()
      .addSuccess(true)
      .addMessage('Chat opened')
      .build();
  }

  @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('visitor:close-chat')
  async handleVisitorCloseChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ): Promise<Response<{ chatId: string; timestamp: number }>> {
    const { chatId, timestamp } = event.data as {
      chatId: string;
      timestamp: number;
    };
    const command = new ParticipantUnseenChatCommand({
      chatId,
      participantId: client.user.sub,
      unseenAt: new Date(timestamp),
    });

    await this.commandBus.execute<ParticipantUnseenChatCommand, void>(command);
    return new ResponseBuilder<any>()
      .addSuccess(true)
      .addMessage('Chat closed')
      .build();
  }

  @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('tracking:tracking-event')
  async handleTrackingEvent(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ): Promise<Response<{ trackingEventId: string }>> {
    const { trackingEventId, metadata, eventType } = event.data as {
      trackingEventId: string;
      metadata: Record<string, unknown>;
      eventType: string;
    };
    const command = new CreateTrackingEventCommand({
      id: trackingEventId,
      visitorId: client.user.sub,
      eventType: eventType || 'unknown',
      metadata: metadata || {},
      occurredAt: new Date(event.timestamp),
    });
    await this.commandBus.execute<CreateTrackingEventCommand, void>(command);
    return new ResponseBuilder<any>()
      .addSuccess(true)
      .addMessage('Tracking event created')
      .build();
  }

  @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('visitor:chat-active')
  async handleVisitorChatActive(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ): Promise<Response<{ chatId: string; timestamp: number }>> {
    const { chatId, timestamp } = event.data as {
      chatId: string;
      timestamp: number;
    };
    const command = new ParticipantSeenChatCommand({
      chatId,
      participantId: client.user.sub,
      seenAt: new Date(timestamp),
    });
    await this.commandBus.execute<ParticipantSeenChatCommand, void>(command);
    return new ResponseBuilder<any>()
      .addSuccess(true)
      .addMessage('Chat active')
      .build();
  }

  @SubscribeMessage('health-check')
  handleHealthCheck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ): Promise<Response<Record<string, unknown>>> {
    const token = client.handshake.auth.token as string;
    return Promise.resolve(
      ResponseBuilder.create()
        .addSuccess(true)
        .addMessage('Conexión establecida')
        .addData({ token })
        .build(),
    );
  }
}
