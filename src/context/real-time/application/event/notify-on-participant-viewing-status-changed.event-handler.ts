import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ParticipantViewingStatusChangedEvent } from 'src/context/conversations/chat/domain/chat/events/participant-viewing-status-changed.event';
import { INotification, NOTIFICATION } from '../../domain/notification';

@EventsHandler(ParticipantViewingStatusChangedEvent)
export class NotifyOnParticipantViewingStatusChangedEventHandler
  implements IEventHandler<ParticipantViewingStatusChangedEvent>
{
  private readonly logger = new Logger(
    NotifyOnParticipantViewingStatusChangedEventHandler.name,
  );

  constructor(
    @Inject(NOTIFICATION) private readonly notificationService: INotification,
  ) {}

  async handle(event: ParticipantViewingStatusChangedEvent): Promise<void> {
    // Filtramos los destinatarios excluyendo al participante que realizó la acción
    const recipients = event.params.attributes.chat.participants.filter(
      (participant) =>
        participant.id !== event.params.attributes.participantUpdate.id,
    );

    if (recipients.length === 0) {
      this.logger.warn(
        `No hay destinatarios para la notificación de cambio de estado de visualización del participante ${event.params.attributes.participantUpdate.id}`,
      );
      return;
    }

    for (const recipient of recipients) {
      const recipientId = recipient.id;
      this.logger.log(
        `Notificando cambio de estado de visualización del participante ${event.params.attributes.participantUpdate.id} al destinatario ${recipientId}`,
      );

      try {
        await this.notificationService.notify({
          type: 'participant:viewing-status-changed',
          payload: event.params.attributes,
          recipientId: recipientId,
        });
      } catch (error) {
        // Capturar errores para que no interrumpan el flujo si una notificación falla
        this.logger.error(
          `Error al notificar el cambio de estado de visualización al participante ${recipientId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
