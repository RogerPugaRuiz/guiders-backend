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
import { RealTimeMessageSenderCommand } from 'src/context/real-time-context/websocket/application/command/message/real-time-message-sender.command';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

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
    const { message, timestamp, chatId } = event.data as {
      message: string;
      timestamp: number;
      chatId: string;
    };

    const command = new RealTimeMessageSenderCommand(
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
        ResponseBuilder.build(false, result.error.message),
      );
    }

    return Promise.resolve(
      ResponseBuilder.build(true, 'Mensaje enviado al comercial'),
    );

    // const result = await this.commandBus.execute<
    //   SendMessageToCommercialCommand,
    //   SendMessageToCommercialResponse
    // >(
    //   SendMessageToCommercialCommand.create({
    //     chatId: client.user.sub,
    //     from: client.user.sub,
    //     to: 'all',
    //     message,
    //     timestamp: new Date(timestamp),
    //   }),
    // );

    // if (result.isErr()) {
    //   return Promise.resolve(
    //     ResponseBuilder.build(false, result.error.message),
    //   );
    // }

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

    // const result = await this.commandBus.execute<
    //   SendMessageToVisitorCommand,
    //   SendMessageToVisitorResponse
    // >(
    //   SendMessageToVisitorCommand.create({
    //     chatId: message.chat,
    //     from: message.from,
    //     to: message.to,
    //     message: message.text,
    //     timestamp: new Date(message.timestamp),
    //   }),
    // );

    // if (result.isErr()) {
    //   return Promise.resolve(
    //     ResponseBuilder.build(false, result.error.message),
    //   );
    // }

    return Promise.resolve(
      ResponseBuilder.build(true, 'Mensaje enviado al visitante'),
    );
  }

  @Roles(['commercial'])
  @UseGuards(WsAuthGuard, WsRolesGuard)
  @SubscribeMessage('get_commercial_chats')
  async handleGetCommercialChats(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.user.sub} is getting chat list`);

    // const { chats } = await this.queryBus.execute<
    //   FindCommercialChatsQuery,
    //   FindCommercialChatsQueryResult
    // >(new FindCommercialChatsQuery(client.user.sub));

    return Promise.resolve(ResponseBuilder.build(true, 'Chats obtenidos', {}));
  }
}
