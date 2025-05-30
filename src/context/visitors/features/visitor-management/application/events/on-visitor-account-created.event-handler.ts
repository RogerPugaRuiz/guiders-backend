import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { VisitorAccountCreatedEvent } from 'src/context/auth/features/auth-visitor/domain/events/visitor-account-created.event';
import { CreateDefaultVisitorCommand } from '../commands/create-default-visitor.command';

/**
 * Manejador que escucha el evento de creación de cuenta de visitante del contexto auth
 * y crea un visitante por defecto en el contexto visitors
 */
@EventsHandler(VisitorAccountCreatedEvent)
export class OnVisitorAccountCreatedEventHandler
  implements IEventHandler<VisitorAccountCreatedEvent>
{
  private readonly logger = new Logger(
    OnVisitorAccountCreatedEventHandler.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Maneja el evento de creación de cuenta de visitante
   * @param event Evento con los datos de la cuenta de visitante creada
   */
  async handle(event: VisitorAccountCreatedEvent): Promise<void> {
    this.logger.log(
      `Evento de creación de cuenta de visitante recibido: ${event.visitorAccountPrimitive.id}`,
    );

    try {
      // Extraemos el ID de la cuenta de visitante
      const visitorAccountId = event.visitorAccountPrimitive.id;

      // Enviamos el comando para crear un visitante por defecto
      await this.commandBus.execute(
        new CreateDefaultVisitorCommand(visitorAccountId),
      );

      this.logger.log(
        `Comando para crear visitante por defecto enviado correctamente`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al manejar evento de creación de cuenta de visitante: ${errorMessage}`,
      );
    }
  }
}
