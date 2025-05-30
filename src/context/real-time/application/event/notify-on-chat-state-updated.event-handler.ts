import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { StatusUpdatedEvent } from 'src/context/conversations/features/chat/domain/chat/events/status-updated.event';
import { INotification, NOTIFICATION } from '../../domain/notification';

@EventsHandler(StatusUpdatedEvent)
export class NotifyOnChatStateUpdatedEventHandler
  implements IEventHandler<StatusUpdatedEvent>
{
  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}
  async handle(event: StatusUpdatedEvent) {
    for (const participant of event.params.attributes.chat.participants) {
      await this.notificationService.notify({
        recipientId: participant.id,
        payload: {
          status: event.params.attributes.chat.status,
          chatId: event.params.attributes.chat.id,
        },
        type: 'chat:status-updated',
      });
    }
  }
}
