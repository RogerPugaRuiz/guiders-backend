import { Inject } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ConnectedEvent } from 'src/context/real-time/websocket/domain/events/connected.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../../domain/chat/chat';

@EventsHandler(ConnectedEvent)
export class UpdateParticipantStatusOnConnectedEventHandler
  implements IEventHandler<ConnectedEvent>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}
  async handle(event: ConnectedEvent): Promise<void> {
    const { connection } = event;

    const criteria = new Criteria<Chat>().addFilter(
      'participants',
      Operator.EQUALS,
      connection.userId,
    );

    const { chats } = await this.chatRepository.find(criteria);

    for (const chat of chats) {
      const updatedChat = chat.participantOnline(connection.userId, true);
      const chatWithEvents = this.publisher.mergeObjectContext(updatedChat);
      await this.chatRepository.save(updatedChat);
      chatWithEvents.commit();
    }
  }
}
