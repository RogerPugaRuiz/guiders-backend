import { Inject } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../../domain/chat/chat';
import { DisconnectedEvent } from 'src/context/real-time/websocket/domain/events/disconnected.event';

@EventsHandler(DisconnectedEvent)
export class UpdateParticipantStatusOnDisconnectedEventHandler
  implements IEventHandler<DisconnectedEvent>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}
  async handle(event: DisconnectedEvent): Promise<void> {
    const { connection } = event;

    const criteria = new Criteria<Chat>().addFilter(
      'participants',
      Operator.EQUALS,
      connection.userId,
    );

    const { chats } = await this.chatRepository.find(criteria);

    for (const chat of chats) {
      const updatedChat = chat.participantOnline(connection.userId, false);
      const chatWithEvents = this.publisher.mergeObjectContext(updatedChat);
      await this.chatRepository.save(updatedChat);
      chatWithEvents.commit();
    }
  }
}
