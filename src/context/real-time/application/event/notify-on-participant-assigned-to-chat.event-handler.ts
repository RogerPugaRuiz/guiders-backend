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
    this.logger.log(
      `New participant assigned to chat: ${chat.id}, participant: ${newParticipant.id}`,
    );
    try {
      // Notificar al nuevo participante sobre su asignación al chat
      await this.notification.notify({
        payload: { chat },
        recipientId: newParticipant.id,
        type: 'commercial:incoming-chats',
      });

      this.logger.log(
        `New participant ${newParticipant.id} notified about chat ${chat.id}`,
      );

      // Notificar a todos los participantes existentes sobre el nuevo participante
      for (const participant of chat.participants) {
        // No notificar al propio participante que se está uniendo
        if (participant.id !== newParticipant.id) {
          await this.notification.notify({
            payload: {
              chatId: chat.id,
              newParticipant: newParticipant,
            },
            recipientId: participant.id,
            type: 'chat:participant-joined',
          });
        }
      }

      this.logger.log(
        `Participant assigned to chat: ${chat.id}, new participant: ${newParticipant.id}, notified all other participants`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify participants about new participant ${newParticipant.id} in chat ${chat.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Gracefully handle the error - don't throw
    }
  }
}
