import { Inject } from '@nestjs/common';
import { EventPublisher, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ChatCommercialsAssignedEvent } from 'src/context/real-time/websocket/domain/events/chat-commercials-assigned.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../domain/chat/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../../../domain/chat/chat';
import { IUserFinder, USER_FINDER } from '../../../read/get-username-by-id';

@EventsHandler(ChatCommercialsAssignedEvent)
export class UpdateChatParticipantsOnCommercialsAssignedEventHandler
  implements IEventHandler<ChatCommercialsAssignedEvent>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
    @Inject(USER_FINDER) private readonly userFinder: IUserFinder,
    private readonly publisher: EventPublisher,
  ) {}
  async handle(event: ChatCommercialsAssignedEvent) {
    const { chatId, commercialIds } = event;

    const chat = await this.getChat(chatId);

    let updatedChat = chat;
    for (const commercialId of commercialIds) {
      updatedChat = updatedChat.asignCommercial({
        id: commercialId,
        name: await this.userFinder.findById(commercialId),
      });
    }

    const chatAggregate = this.publisher.mergeObjectContext(updatedChat);

    await this.chatRepository.save(chatAggregate);

    chatAggregate.commit();
  }

  async getChat(chatId: string) {
    const criteria = new Criteria<Chat>().addFilter(
      'id',
      Operator.EQUALS,
      chatId,
    );

    const optionalChat = await this.chatRepository.findOne(criteria);
    if (optionalChat.isEmpty()) {
      throw new Error('Chat not found');
    }
    return optionalChat.get().chat;
  }
}
