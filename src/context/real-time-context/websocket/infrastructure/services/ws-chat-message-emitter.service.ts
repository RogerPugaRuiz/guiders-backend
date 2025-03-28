import { Injectable } from '@nestjs/common';
import { IChatMessageEmitter } from '../../domain/message-emitter';
import { ConnectionUser } from '../../domain/connection-user';
import {
  RealTimeWebSocketGateway,
  ResponseBuilder,
} from '../websocket.gateway';
import { err, okVoid, Result } from 'src/context/shared/domain/result';
import { UserNotConnectedError } from '../../domain/errors';
import { ConnectionRole } from '../../domain/value-objects/connection-role';

@Injectable()
export class WsChatMessageEmitterService implements IChatMessageEmitter {
  constructor(private readonly ws: RealTimeWebSocketGateway) {}

  async emit(params: {
    from: ConnectionUser;
    to?: ConnectionUser | null | undefined;
    message: string;
    timestamp: Date;
  }): Promise<Result<void, UserNotConnectedError>> {
    const { from, to, message, timestamp } = params;
    if (!this.ws) {
      throw new Error('Socket server not set');
    }
    if (from.socketId.isEmpty()) {
      return Promise.resolve(err(new UserNotConnectedError(from.userId.value)));
    }

    if (to && to.socketId.isEmpty()) {
      return Promise.resolve(err(new UserNotConnectedError(to.userId.value)));
    }
    if (!to && from.hasRole(ConnectionRole.visitor())) {
      this.ws.server.to(ConnectionRole.commercial().value).emit(
        'chat_message',
        ResponseBuilder.build(
          true,
          `visitor ${from.userId.value} sent a message: ${message} at ${timestamp.toISOString()}`,
          {
            sender: from.userId.value,
            message,
            timestamp: timestamp.getTime(),
          },
          'chat_message',
        ),
      );
      return Promise.resolve(okVoid());
    }
    const toSocketId = to!.socketId.get().value;
    const fromUserId = from.userId.value;
    const toUserId = to!.userId.value;
    this.ws.server.to(toSocketId).emit(
      'chat_message',
      ResponseBuilder.build(
        true,
        `user ${fromUserId} sent a message: ${message} to user ${toUserId} at ${timestamp.toISOString()}`,
        {
          sender: fromUserId,
          message,
          timestamp: timestamp.getTime(),
        },
        'chat_message',
      ),
    );

    return Promise.resolve(okVoid());
  }
}
