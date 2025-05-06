import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ParticipantSeenAtEvent } from 'src/context/chat/chat/domain/chat/events/participant-seen-at.event';
import { INotification, NOTIFICATION } from '../../domain/notification';

@EventsHandler(ParticipantSeenAtEvent)
export class NotifyOnParticipantSeenChatEventHandler
  implements IEventHandler<ParticipantSeenAtEvent>
{
  private readonly logger = new Logger(
    NotifyOnParticipantSeenChatEventHandler.name,
  );
  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}
  async handle(event: ParticipantSeenAtEvent) {
    const recipients = event.params.attributes.chat.participants.filter(
      (participant) =>
        participant.id !== event.params.attributes.participantUpdate.id,
    );
    if (recipients.length === 0) {
      this.logger.warn(
        `No recipients found for participant seen chat event with ID: ${event.params.attributes.participantUpdate.id}`,
      );
      return;
    }
    for (const recipient of recipients) {
      const recipientId = recipient.id;
      this.logger.log(
        `Notifying participant seen chat for ID: ${event.params.attributes.participantUpdate.id} to recipient ID: ${recipientId}`,
      );
      await this.notificationService.notify({
        type: 'participant:seen-chat',
        payload: event.params.attributes,
        recipientId: recipientId,
      });
    }
  }
}
