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
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
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
import { FindCommercialChatsQuery } from 'src/context/chat-context/chat/application/query/find/commercial/find-commercial-chats.query';
import { FindCommercialChatsQueryResult } from 'src/context/chat-context/chat/application/query/find/commercial/find-commercial-chats.query-handler';
import { SendMessageToVisitorCommand } from '../application/command/message/to-visitor/send-message-to-visitor.command';
import { SendMessageToVisitorResponse } from '../application/command/message/to-visitor/send-message-to-visitor.command-handler';
import { SendMessageToCommercialCommand } from '../application/command/message/to-commercial/send-message-to-commercial.command';
import { SendMessageToCommercialResponse } from '../application/command/message/to-commercial/send-message-to-commercial.command-handler';

export interface Event {
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

export class ResponseBuilder {
  static build<T extends Record<string, unknown>>(
    success: boolean,
    message: string,
    data: T = {} as T,
    type: string = 'default',
  ): SuccessResponse<T> | ErrorResponse {
    const timestamp = Date.now();
    if (success) {
      return {
        type,
        message,
        timestamp,
        data,
      };
    }
    return {
      error: message,
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

  afterInit(server: Server) {
    this.server = server;
  }

  constructor(
    private readonly tokenVerifyService: TokenVerifyService,
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
      const socketId = client.id;
      const { sub: connectionId, role: roles } =
        await this.tokenVerifyService.verifyToken(token);

      await this.commandBus.execute(
        new ConnectUserCommand(connectionId, roles, socketId),
      );

      await Promise.all(roles.map(async (r) => client.join(r)));
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
    const socketId = client.id;
    const { user } = await this.queryBus.execute<
      FindOneUserBySocketIdQuery,
      FindOneUserBySocketIdQueryResult
    >(new FindOneUserBySocketIdQuery(socketId));
    if (user) {
      await this.commandBus.execute(new DisconnectUserCommand(user.userId));
    }
  }

  @Roles(['visitor'])
  @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('send_message_to_commercial')
  async handleVisitorSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    this.logger.log(event);
    this.logger.log(
      `User ${client.user.sub} is sending message to commercial `,
    );

    const { message, timestamp } = event.data as {
      message: string;
      timestamp: number;
    };

    const result = await this.commandBus.execute<
      SendMessageToCommercialCommand,
      SendMessageToCommercialResponse
    >(
      SendMessageToCommercialCommand.create({
        chatId: client.user.sub,
        from: client.user.sub,
        to: 'all',
        message,
        timestamp: new Date(timestamp),
      }),
    );

    if (result.isErr()) {
      return Promise.resolve(
        ResponseBuilder.build(false, result.error.message),
      );
    }

    return Promise.resolve({
      success: true,
      message: 'Mensaje enviado al comercial',
    });
  }

  @Roles(['commercial'])
  @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('send_message_to_visitor')
  async handleCommercialSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: Event,
  ) {
    const { message } = event.data as {
      message: {
        chat: string;
        text: string;
        timestamp: number;
        from: string;
        to: string;
      };
    };
    this.logger.log(
      `User ${client.user.sub} is sending message to visitor `,
      message,
    );

    const result = await this.commandBus.execute<
      SendMessageToVisitorCommand,
      SendMessageToVisitorResponse
    >(
      SendMessageToVisitorCommand.create({
        chatId: message.chat,
        from: message.from,
        to: message.to,
        message: message.text,
        timestamp: new Date(message.timestamp),
      }),
    );

    if (result.isErr()) {
      return Promise.resolve(
        ResponseBuilder.build(false, result.error.message),
      );
    }

    return Promise.resolve(
      ResponseBuilder.build(true, 'Mensaje enviado al visitante'),
    );
  }

  @Roles(['commercial'])
  @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('get_commercial_chats')
  async handleGetCommercialChats(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.user.sub} is getting chat list`);

    const { chats } = await this.queryBus.execute<
      FindCommercialChatsQuery,
      FindCommercialChatsQueryResult
    >(new FindCommercialChatsQuery(client.user.sub));

    return Promise.resolve(
      ResponseBuilder.build(true, 'Chats obtenidos', { chats }),
    );
  }

  // @Roles(['commercial'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  // @SubscribeMessage('get_chat_list')
  // async handleGetVisitors(client: AuthenticatedSocket) {
  //   this.logger.log(`User ${client.user.sub} is getting chat list`);
  //   // this.logger.log(`Chats: ${JSON.stringify(chats)}`);
  //   const response = await this.queryBus.execute<
  //     GetCommercialChatsQuery,
  //     GetCommercialChatsQueryResponse
  //   >(new GetCommercialChatsQuery(client.user.sub));
  //   client.emit('chat_list', response);
  // }

  // @Roles(['visitor'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  // @SubscribeMessage('init_chat')
  // handleInitChat(
  //   @ConnectedSocket() client: AuthenticatedSocket,
  //   @MessageBody() data: { visitorId: string },
  // ) {
  //   this.logger.log(
  //     `User ${client.user.sub} is initializing chat with visitor ${data.visitorId}`,
  //   );
  // }

  // @Roles(['visitor', 'commercial'])
  // @UseGuards(WsAuthGuard, WsRolesGuard)
  // @SubscribeMessage('chat_message')
  // async handleChatMessage(
  //   @ConnectedSocket() client: AuthenticatedSocket,
  //   @MessageBody()
  //   payload: { type: string; data: Record<string, unknown>; timestamp: number },
  // ): Promise<{ success: boolean; message: string }> {
  //   // Para un visitante
  //   if (client.user.role.includes('visitor')) {
  //     const { message } = payload.data;
  //     if (!message) {
  //       return { success: false, message: 'Faltan parámetros (message)' };
  //     }
  //     this.logger.log(
  //       `User ${client.user.sub} is sending message to commercial`,
  //     );
  //     this.handleVisitorMessage(client.user.sub, message as string);
  //     return { success: true, message: 'Mensaje enviado al comercial' };
  //   }

  //   // Para un comercial
  //   const { to, message } = payload.data;
  //   if (!to || !message) {
  //     return { success: false, message: 'Faltan parámetros (to, message)' };
  //   }
  //   this.logger.log(`User ${client.user.sub} is sending message to visitor`);
  //   this.handleCommercialMessage(
  //     to as string,
  //     message as string,
  //     client.user.sub,
  //   );
  //   return { success: true, message: 'Mensaje enviado al visitante' };
  // }

  // /**
  //  * Lógica cuando un visitante envía un mensaje.
  //  * Puede ir directamente a un comercial asignado o, si no existe aún, emitirse a todos los comerciales.
  //  */
  // private async handleVisitorMessage(
  //   visitorId: string,
  //   text: string,
  // ): Promise<void> {
  //   const { chat } = await this.queryBus.execute<
  //     FindChatByVisitorQuery,
  //     FindChatByVisitorQueryResponse
  //   >(new FindChatByVisitorQuery(visitorId));

  //   if (!chat) {
  //     this.logger.error(`No existe Chat para el visitante ${visitorId}`);
  //     return;
  //   }

  //   // Si no hay comercial asignado, se envía a todos
  //   if (!chat.commercialId) {
  //     await this.broadcastToAllCommercials(chat.chatId, visitorId, text);
  //     return;
  //   }

  //   // De lo contrario, se envía al comercial específico
  //   const { socketId } = await this.getSocketByUser.execute({
  //     userId: chat.commercialId,
  //   });
  //   if (!socketId) {
  //     this.logger.error(
  //       `No se encontró socket para el comercial ${chat.commercialId}`,
  //     );
  //     return;
  //   }

  //   // Emitimos y persistimos
  //   this.emitChatMessage(socketId, text, visitorId);
  //   await this.saveNewMessage(chat.chatId, visitorId, text);
  // }

  // /**
  //  * Lógica cuando un comercial envía un mensaje a un visitante.
  //  */
  // private async handleCommercialMessage(
  //   visitorId: string,
  //   text: string,
  //   commercialId: string,
  // ): Promise<void> {
  //   const { chat } = await this.queryBus.execute<
  //     FindChatByVisitorQuery,
  //     FindChatByVisitorQueryResponse
  //   >(new FindChatByVisitorQuery(visitorId));
  //   if (!chat) {
  //     this.logger.error(`No existe Chat para el visitante ${visitorId}`);
  //     return;
  //   }
  //   // Obtenemos el socket del visitante y emitimos el mensaje
  //   const { socketId } = await this.getSocketByUser.execute({
  //     userId: visitorId,
  //   });
  //   if (!socketId) {
  //     this.logger.error(`No se encontró socket para el visitante ${visitorId}`);
  //     return;
  //   }

  //   this.emitChatMessage(socketId, text, commercialId);
  //   await this.saveNewMessage(chat.chatId, commercialId, text);
  // }

  // /**
  //  * Envía un mensaje a todos los comerciales disponibles.
  //  */
  // private async broadcastToAllCommercials(
  //   chatId: string,
  //   senderId: string,
  //   text: string,
  // ) {
  //   this.logger.log('Enviando mensaje a todos los comerciales');
  //   this.emitChatMessage(ConnectionRoleEnum.COMMERCIAL, text, senderId);
  //   await this.saveNewMessage(chatId, senderId, text);
  // }

  // /**
  //  * Emite un 'chat_message' a un socket o a un rol (grupo de sockets) con su respectivo timestamp.
  //  */
  // private emitChatMessage(
  //   destination: string,
  //   messageText: string,
  //   from: string,
  // ): void {
  //   const timestamp = Date.now();
  //   this.server.to(destination).emit('chat_message', {
  //     type: 'chat_message',
  //     data: {
  //       message: messageText,
  //       from,
  //     },
  //     timestamp,
  //   });
  //   this.logger.log(`Mensaje emitido a ${destination}`);
  // }

  // /**
  //  * Persiste (guarda) el nuevo mensaje usando el CommandBus.
  //  */
  // private async saveNewMessage(
  //   chatId: string,
  //   senderId: string,
  //   text: string,
  //   timestamp: number = Date.now(),
  // ): Promise<void> {
  //   await this.commandBus.execute(
  //     new NewMessageCommand(chatId, senderId, text, new Date(timestamp)),
  //   );
  // }

  // /**
  //  * Métodos extra para emitir a un usuario o rol genérico.
  //  */
  // public async emitEventToUser(
  //   userId: string,
  //   event: string,
  //   data: any,
  // ): Promise<void> {
  //   const { socketId } = await this.getSocketByUser.execute({ userId });
  //   if (!socketId) {
  //     this.logger.error(`No se encontró socket para el usuario ${userId}`);
  //     return;
  //   }
  //   this.server.to(socketId).emit(event, data);
  // }

  // public emitEventToRole(
  //   role: ConnectionRoleEnum,
  //   event: string,
  //   data: any,
  // ): void {
  //   this.server.to(role).emit(event, data);
  // }
}
