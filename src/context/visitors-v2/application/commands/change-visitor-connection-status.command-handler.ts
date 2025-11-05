import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ChangeVisitorConnectionStatusCommand } from './change-visitor-connection-status.command';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { ConnectionStatus } from '../../domain/value-objects/visitor-connection';

/**
 * Handler para el comando ChangeVisitorConnectionStatusCommand
 * Se encarga de cambiar el estado de conexión de un visitante manualmente
 */
@CommandHandler(ChangeVisitorConnectionStatusCommand)
export class ChangeVisitorConnectionStatusCommandHandler
  implements ICommandHandler<ChangeVisitorConnectionStatusCommand, void>
{
  private readonly logger = new Logger(
    ChangeVisitorConnectionStatusCommandHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ChangeVisitorConnectionStatusCommand): Promise<void> {
    this.logger.log(
      `Cambiando estado de conexión para visitante: ${command.visitorId} a ${command.newStatus}`,
    );

    try {
      const visitorId = new VisitorId(command.visitorId);

      // Validar que el estado es válido
      if (!Object.values(ConnectionStatus).includes(command.newStatus as any)) {
        throw new Error(
          `Estado de conexión inválido: ${command.newStatus}. Los estados válidos son: ${Object.values(ConnectionStatus).join(', ')}`,
        );
      }

      const newStatus = command.newStatus as ConnectionStatus;

      // Buscar el visitante
      const visitorResult = await this.visitorRepository.findById(visitorId);

      if (visitorResult.isErr()) {
        this.logger.warn(
          `No se encontró el visitante con ID: ${command.visitorId}`,
        );
        throw new Error(
          `No se encontró el visitante con ID: ${command.visitorId}`,
        );
      }

      const visitor = visitorResult.unwrap();
      if (!visitor) {
        this.logger.warn(
          `Visitante no encontrado con ID: ${command.visitorId}`,
        );
        throw new Error(`Visitante no encontrado con ID: ${command.visitorId}`);
      }

      // Aplicar el cambio de estado según el nuevo estado deseado
      const aggCtx = this.publisher.mergeObjectContext(visitor);

      switch (newStatus) {
        case ConnectionStatus.ONLINE:
          aggCtx.goOnline();
          break;
        case ConnectionStatus.CHATTING:
          aggCtx.startChatting();
          break;
        case ConnectionStatus.AWAY:
          aggCtx.goAway();
          break;
        case ConnectionStatus.OFFLINE:
          aggCtx.goOffline();
          break;
        default:
          throw new Error(
            `Estado de conexión no soportado: ${command.newStatus}`,
          );
      }

      // Guardar cambios y publicar eventos
      await this.visitorRepository.save(aggCtx);
      aggCtx.commit();

      this.logger.log(
        `Estado de conexión actualizado exitosamente para visitante: ${command.visitorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al cambiar estado de conexión para visitante ${command.visitorId}:`,
        error,
      );
      throw error;
    }
  }
}
