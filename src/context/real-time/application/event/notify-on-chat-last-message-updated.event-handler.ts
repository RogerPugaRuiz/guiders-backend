import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/conversations/chat/domain/chat/events/chat-updated-with-new-message.event';
import { NOTIFICATION, INotification } from '../../domain/notification';

@EventsHandler(ChatUpdatedWithNewMessageEvent)
export class NotifyOnChatLastMessageUpdatedEventHandler
  implements IEventHandler<ChatUpdatedWithNewMessageEvent>
{
  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}
  async handle(event: ChatUpdatedWithNewMessageEvent) {
    const { lastMessage, lastMessageAt } = event.attributes.chat;
    const { chatId, senderId } = event.attributes.message;
    for (const participant of event.attributes.chat.participants) {
      await this.notificationService.notify({
        recipientId: participant.id,
        payload: {
          lastMessage,
          lastMessageAt,
          chatId,
          senderId,
        },
        type: 'chat:last-message-updated',
      });
    }
  }
}
