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
      `📥 [ChangeVisitorConnectionStatusCommand RECIBIDO] visitante: ${command.visitorId} → ${command.newStatus}`,
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
        this.logger.error(
          `❌ No se encontró el visitante con ID: ${command.visitorId} - ERROR: ${visitorResult.error.message}`,
        );
        throw new Error(
          `No se encontró el visitante con ID: ${command.visitorId}`,
        );
      }

      const visitor = visitorResult.unwrap();
      if (!visitor) {
        this.logger.error(
          `❌ Visitante no encontrado con ID: ${command.visitorId}`,
        );
        throw new Error(`Visitante no encontrado con ID: ${command.visitorId}`);
      }

      const currentStatus = visitor.getConnectionStatus();
      this.logger.log(
        `📋 Visitante ${command.visitorId} encontrado | Estado actual: ${currentStatus} | Nuevo estado: ${newStatus}`,
      );

      // IMPORTANTE: Aplicar cambio de estado ANTES de mergeObjectContext
      // para que los eventos se registren correctamente
      this.logger.log(
        `🔄 Aplicando cambio de estado ${currentStatus} → ${newStatus} con método: go${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}()`,
      );

      switch (newStatus) {
        case ConnectionStatus.ONLINE:
          visitor.goOnline();
          break;
        case ConnectionStatus.CHATTING:
          visitor.startChatting();
          break;
        case ConnectionStatus.AWAY:
          visitor.goAway();
          break;
        case ConnectionStatus.OFFLINE:
          visitor.goOffline();
          break;
        default:
          throw new Error(
            `Estado de conexión no soportado: ${command.newStatus}`,
          );
      }

      this.logger.log(
        `✅ Estado aplicado. Wrapping con EventPublisher.mergeObjectContext()...`,
      );

      // IMPORTANTE: Hacer mergeObjectContext DESPUÉS de modificar el agregado
      // para que el EventPublisher capture los eventos ya generados
      const aggCtx = this.publisher.mergeObjectContext(visitor);

      this.logger.log(
        `💾 Guardando visitante ${command.visitorId} en repositorio...`,
      );

      // Guardar cambios
      await this.visitorRepository.save(aggCtx);

      this.logger.log(
        `✅ Visitante ${command.visitorId} guardado. Llamando commit() para publicar eventos...`,
      );

      // Publicar eventos al EventBus
      aggCtx.commit();

      this.logger.log(
        `✅ [commit() EJECUTADO] Visitante ${command.visitorId} | ${currentStatus} → ${newStatus} | VisitorConnectionChangedEvent publicado`,
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
