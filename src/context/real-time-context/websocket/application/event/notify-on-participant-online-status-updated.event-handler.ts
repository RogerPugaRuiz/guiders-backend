import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ParticipantOnlineStatusUpdatedEvent } from 'src/context/chat-context/chat/domain/chat/events/participant-online-status-updated.event';
import { INotification, NOTIFICATION } from '../../domain/notification';

@EventsHandler(ParticipantOnlineStatusUpdatedEvent)
export class NotifyOnParticipantOnlineStatusUpdatedEventHandler
  implements IEventHandler<ParticipantOnlineStatusUpdatedEvent>
{
  private readonly logger = new Logger(
    NotifyOnParticipantOnlineStatusUpdatedEventHandler.name,
  );
  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}
  async handle(event: ParticipantOnlineStatusUpdatedEvent) {
    const { attributes } = event;
    const { updatedParticipant, chat } = attributes;
    this.logger.log(
      `Notificando a ${updatedParticipant.id} que su estado online ha cambiado a ${updatedParticipant.isOnline}`,
    );

    const recipientIdList = chat.participants
      .filter((participant) => participant.id !== updatedParticipant.id)
      .map((participant) => participant.id);
    for (const recipientId of recipientIdList) {
      await this.notificationService.notify({
        recipientId,
        payload: {
          isOnline: updatedParticipant.isOnline,
          participantId: updatedParticipant.id,
        },
        type: 'participant:online-status-updated',
      });
    }
  }
}
