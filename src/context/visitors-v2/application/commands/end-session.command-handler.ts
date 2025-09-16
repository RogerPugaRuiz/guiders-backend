import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { EndSessionCommand } from './end-session.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../domain/visitor-v2.repository';
import { SessionId } from '../../domain/value-objects/session-id';

@CommandHandler(EndSessionCommand)
export class EndSessionCommandHandler
  implements ICommandHandler<EndSessionCommand, void>
{
  private readonly logger = new Logger(EndSessionCommandHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: EndSessionCommand): Promise<void> {
    try {
      this.logger.log(
        `Cerrando sesión: ${command.sessionId}${command.reason ? ` (${command.reason})` : ''}`,
      );

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

      // Cerrar la sesión
      visitor.endCurrentSession();

      // Persistir cambios con eventos
      const visitorContext = this.publisher.mergeObjectContext(visitor);
      const saveResult = await this.visitorRepository.save(visitorContext);

      if (saveResult.isErr()) {
        this.logger.error(
          'Error al guardar visitante:',
          saveResult.error.message,
        );
        throw new Error('Error al cerrar sesión');
      }

      // Commit eventos (esto disparará SessionEndedEvent)
      visitorContext.commit();

      this.logger.log(`Sesión cerrada exitosamente: ${command.sessionId}`);
    } catch (error) {
      this.logger.error('Error al cerrar sesión:', error);
      throw error;
    }
  }
}
