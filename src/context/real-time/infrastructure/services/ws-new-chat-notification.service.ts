import { Inject, Injectable } from '@nestjs/common';
import { RealTimeWebSocketGateway } from '../websocket.gateway';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../domain/connection-user';
import { INewChatNotification } from '../../domain/new-chat-notification';
import { ChatPrimitives } from 'src/context/conversations/features/chat/domain/chat/chat';

@Injectable()
export class WsNewChatNotificationService implements INewChatNotification {
  constructor(
    private readonly ws: RealTimeWebSocketGateway,
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
  ) {}

  async notifyNewChat(
    chatPrimitives: ChatPrimitives,
    to: string,
  ): Promise<void> {
    if (!this.ws) {
      throw new Error('Socket server not set');
    }
    const participant = chatPrimitives.participants.find(
      (participant) => participant.id === to,
    );

    if (!participant) {
      return Promise.resolve();
    }

    console.log(
      `Emitting new chat notification to ${participant.id} with data: ${JSON.stringify(
        chatPrimitives,
      )}`,
    );

    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      participant.id,
    );

    const connections = await this.connectionRepository.find(criteria);
    console.log(connections);

    this.ws.sendNotificationToParticipants({
      participants: connections,
      data: { ...chatPrimitives },
    });

    return Promise.resolve();
  }
}
