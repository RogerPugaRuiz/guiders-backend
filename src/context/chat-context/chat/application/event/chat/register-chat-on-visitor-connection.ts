import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ConnectedEvent } from 'src/context/real-time-context/websocket/domain/events/connected.event';
import { Inject } from '@nestjs/common';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { Chat } from '../../../domain/chat/chat';
import { VisitorId } from '../../../domain/chat/value-objects/visitor-id';

@EventsHandler(ConnectedEvent)
export class RegisterChatOnVisitorConnection
  implements IEventHandler<ConnectedEvent>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    private readonly publisher: EventPublisher,
  ) {}
  async handle(event: ConnectedEvent): Promise<void> {
    console.log('Visitor connected', event);
    if (event.roles.includes('commercial')) {
      return;
    }
    const criteria = new Criteria<Chat>().addFilter(
      'visitorId',
      Operator.EQUALS,
      event.connectionId,
    );
    const optionalChat = await this.chatRepository.findOne(criteria);

    return await optionalChat.fold(
      async () => {
        console.log('Chat not found');
        const newChat = Chat.createNewChat({
          visitorId: VisitorId.create(event.connectionId),
        });
        this.publisher.mergeObjectContext(newChat);

        await this.chatRepository.save(newChat);

        newChat.commit();
      },
      async (chat) => {
        console.log('Chat found', chat);
        return Promise.resolve();
      },
    );
  }
}
