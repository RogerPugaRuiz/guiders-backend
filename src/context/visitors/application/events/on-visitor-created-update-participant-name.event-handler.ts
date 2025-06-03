import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { VisitorCreatedEvent } from '../../domain/events/visitor-created-event';
import { UpdateParticipantNameCommand } from 'src/context/conversations/chat/application/update/participants/name/update-participant-name.command';

/**
 * Manejador que escucha el evento de creación de visitante y actualiza el nombre
 * del participante correspondiente en todos los chats donde participa
 */
@EventsHandler(VisitorCreatedEvent)
export class OnVisitorCreatedUpdateParticipantNameEventHandler
  implements IEventHandler<VisitorCreatedEvent>
{
  private readonly logger = new Logger(
    OnVisitorCreatedUpdateParticipantNameEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Maneja el evento de creación de visitante actualizando el nombre del participante
   * @param event Evento con los datos del visitante creado
   */
  async handle(event: VisitorCreatedEvent): Promise<void> {
    this.logger.log(
      `Evento de creación de visitante recibido: ${event.attributes.visitor.id}`,
    );

    try {
      // Solo actualizamos el nombre si el visitante tiene un nombre asignado
      if (event.attributes.visitor.name) {
        this.logger.log(
          `Actualizando nombre del participante con alias: ${event.attributes.visitor.name}`,
        );

        // Enviamos el comando para actualizar el nombre del participante en todos los chats
        await this.commandBus.execute(
          new UpdateParticipantNameCommand(
            event.attributes.visitor.id,
            event.attributes.visitor.name,
          ),
        );

        this.logger.log(
          `Comando para actualizar nombre del participante enviado correctamente`,
        );
      } else {
        this.logger.log(
          `Visitante ${event.attributes.visitor.id} creado sin nombre, no se actualiza participante`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al manejar evento de creación de visitante para actualizar participante: ${errorMessage}`,
      );
    }
  }
}
