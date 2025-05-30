import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ParticipantUnseenAtEvent } from 'src/context/conversations/features/chat/domain/chat/events/participant-unseen-at.event';
import { INotification, NOTIFICATION } from '../../domain/notification';

@EventsHandler(ParticipantUnseenAtEvent)
export class NotifyOnParticipantUnseenChatEventHandler
  implements IEventHandler<ParticipantUnseenAtEvent>
{
  // Logger para registrar información relevante del evento
  private readonly logger = new Logger(
    NotifyOnParticipantUnseenChatEventHandler.name,
  );
  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}
  async handle(event: ParticipantUnseenAtEvent) {
    // Filtramos los destinatarios excluyendo al participante que realizó la acción
    const recipients = event.params.attributes.chat.participants.filter(
      (participant) =>
        participant.id !== event.params.attributes.participantUpdate.id,
    );
    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients found for participant unseen chat event with ID: ${event.params.attributes.participantUpdate.id}`,
      );
      return;
    }
    for (const recipient of recipients) {
      const recipientId = recipient.id;
      this.logger.log(
        `Notifying participant unseen chat for ID: ${event.params.attributes.participantUpdate.id} to recipient ID: ${recipientId}`,
      );
      await this.notificationService.notify({
        type: 'participant:unseen-chat',
        payload: event.params.attributes,
        recipientId: recipientId,
      });
    }
  }
}
