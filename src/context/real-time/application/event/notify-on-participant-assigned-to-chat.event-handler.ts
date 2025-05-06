import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ParticipantAssignedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-assigned.event';
import { INotification, NOTIFICATION } from '../../domain/notification';

@EventsHandler(ParticipantAssignedEvent)
export class NotifyOnParticipantAssignedToChatEventHandler
  implements IEventHandler<ParticipantAssignedEvent>
{
  private readonly logger = new Logger(
    NotifyOnParticipantAssignedToChatEventHandler.name,
  );
  constructor(
    @Inject(NOTIFICATION)
    private readonly notification: INotification,
  ) {}

  async handle(event: ParticipantAssignedEvent) {
    const { attributes } = event;
    const { chat, newParticipant } = attributes;

    await this.notification.notify({
      payload: { chat },
      recipientId: newParticipant.id,
      type: 'commercial:incoming-chats',
    });

    this.logger.log(
      `Participant assigned to chat: ${chat.id}, new participant: ${newParticipant.id}`,
    );
  }
}
