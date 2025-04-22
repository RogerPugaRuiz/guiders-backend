import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/chat-context/chat/domain/chat/events/chat-updated-with-new-message.event';
import { NOTIFICATION, INotification } from '../../domain/notification';

@EventsHandler(ChatUpdatedWithNewMessageEvent)
export class NotifyOnChatLastMessageUpdatedEventHandler
  implements IEventHandler<ChatUpdatedWithNewMessageEvent>
{
  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}
  async handle(event: ChatUpdatedWithNewMessageEvent) {
    const lastMessage = event.params.attributes.chat.lastMessage;
    const lastMessageAt = event.params.attributes.chat.lastMessageAt;
    const chatId = event.params.attributes.chat.id;
    const senderId = event.params.attributes.message.senderId;
    for (const participant of event.params.attributes.chat.participants) {
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
