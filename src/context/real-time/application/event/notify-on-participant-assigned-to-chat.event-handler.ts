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

    try {
      await this.notification.notify({
        payload: { chat },
        recipientId: newParticipant.id,
        type: 'commercial:incoming-chats',
      });

      this.logger.log(
        `Participant assigned to chat: ${chat.id}, new participant: ${newParticipant.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify participant ${newParticipant.id} about chat assignment: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Gracefully handle the error - don't throw
    }
  }
}
