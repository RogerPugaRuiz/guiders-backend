import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { VisitorAliasAssignedEvent } from '../../domain/events/visitor-alias-assigned-event';
import { UpdateParticipantNameCommand } from 'src/context/conversations/chat/application/update/participants/name/update-participant-name.command';

/**
 * Manejador que escucha el evento de asignación de alias de visitante y actualiza el nombre
 * del participante correspondiente en todos los chats donde participa
 */
@EventsHandler(VisitorAliasAssignedEvent)
export class OnVisitorAliasAssignedUpdateParticipantEventHandler
  implements IEventHandler<VisitorAliasAssignedEvent>
{
  private readonly logger = new Logger(
    OnVisitorAliasAssignedUpdateParticipantEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Maneja el evento de asignación de alias actualizando el nombre del participante
   * @param event Evento con los datos del alias asignado al visitante
   */
  async handle(event: VisitorAliasAssignedEvent): Promise<void> {
    this.logger.log(
      `Evento de asignación de alias recibido para visitante: ${event.payload.visitorId} con alias: ${event.payload.alias}`,
    );

    try {
      this.logger.log(
        `Actualizando nombre del participante con alias asignado: ${event.payload.alias}`,
      );

      // Enviamos el comando para actualizar el nombre del participante en todos los chats
      await this.commandBus.execute(
        new UpdateParticipantNameCommand(
          event.payload.visitorId,
          event.payload.alias,
        ),
      );

      this.logger.log(
        `Comando para actualizar nombre del participante enviado correctamente tras asignación de alias`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al manejar evento de asignación de alias para actualizar participante: ${errorMessage}`,
      );
    }
  }
}
