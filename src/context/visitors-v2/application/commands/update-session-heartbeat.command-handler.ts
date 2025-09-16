import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateSessionHeartbeatCommand } from './update-session-heartbeat.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../domain/visitor-v2.repository';
import { SessionId } from '../../domain/value-objects/session-id';

@CommandHandler(UpdateSessionHeartbeatCommand)
export class UpdateSessionHeartbeatCommandHandler
  implements ICommandHandler<UpdateSessionHeartbeatCommand, void>
{
  private readonly logger = new Logger(
    UpdateSessionHeartbeatCommandHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: UpdateSessionHeartbeatCommand): Promise<void> {
    try {
      this.logger.log(`Actualizando heartbeat de sesión: ${command.sessionId}`);

      // Crear value object para sessionId
      const sessionId = new SessionId(command.sessionId);

      // Buscar visitante por sessionId
      const visitorResult =
        await this.visitorRepository.findBySessionId(sessionId);

      if (visitorResult.isErr()) {
        this.logger.warn(
          `No se encontró visitante para la sesión: ${command.sessionId}`,
        );
        throw new Error(`Sesión no encontrada: ${command.sessionId}`);
      }

      const visitor = visitorResult.value;

      // Validación adicional si se proporciona visitorId
      if (command.visitorId && visitor.getId().value !== command.visitorId) {
        this.logger.warn(
          `VisitorId no coincide: esperado ${command.visitorId}, encontrado ${visitor.getId().value}`,
        );
        throw new Error('Sesión no válida para este visitante');
      }

      // Actualizar el heartbeat de la sesión activa
      visitor.updateSessionActivity();

      // Persistir cambios con eventos
      const visitorContext = this.publisher.mergeObjectContext(visitor);
      const saveResult = await this.visitorRepository.save(visitorContext);

      if (saveResult.isErr()) {
        this.logger.error(
          'Error al guardar visitante:',
          saveResult.error.message,
        );
        throw new Error('Error al actualizar heartbeat de sesión');
      }

      // Commit eventos
      visitorContext.commit();

      this.logger.log(
        `Heartbeat actualizado exitosamente para sesión: ${command.sessionId}`,
      );
    } catch (error) {
      this.logger.error('Error al actualizar heartbeat de sesión:', error);
      throw error;
    }
  }
}
