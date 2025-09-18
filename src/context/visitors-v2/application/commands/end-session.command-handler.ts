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
    const startTime = Date.now();

    try {
      this.logger.log(
        `🔚 Iniciando cierre de sesión: sessionId=${command.sessionId}${
          command.visitorId ? `, visitorId=${command.visitorId}` : ''
        }${command.reason ? `, reason="${command.reason}"` : ', reason=voluntary'}`,
      );

      // Crear value object para sessionId
      const sessionId = new SessionId(command.sessionId);

      this.logger.debug(
        `🔍 Buscando visitante por sessionId: ${command.sessionId}`,
      );

      // Buscar visitante por sessionId
      const visitorResult =
        await this.visitorRepository.findBySessionId(sessionId);

      if (visitorResult.isErr()) {
        this.logger.warn(
          `❌ No se encontró visitante para la sesión: ${command.sessionId}`,
        );
        throw new Error(`Sesión no encontrada: ${command.sessionId}`);
      }

      const visitor = visitorResult.value;

      this.logger.log(
        `✅ Visitante encontrado: id=${visitor.getId().value}, fingerprint=${visitor.getFingerprint().value}`,
      );

      // Validación adicional si se proporciona visitorId
      if (command.visitorId && visitor.getId().value !== command.visitorId) {
        this.logger.warn(
          `⚠️ VisitorId no coincide: esperado ${command.visitorId}, encontrado ${visitor.getId().value}`,
        );
        throw new Error('Sesión no válida para este visitante');
      }

      // Obtener información de la sesión antes de cerrarla
      const sessions = visitor.getSessions();
      const currentSession = sessions.find(
        (s) => s.getId().value === command.sessionId && s.isActive(),
      );

      if (currentSession) {
        const sessionPrimitives = currentSession.toPrimitives();
        const sessionDuration =
          Date.now() - new Date(sessionPrimitives.startedAt).getTime();
        this.logger.log(
          `📊 Información de sesión - startedAt=${sessionPrimitives.startedAt}, duration=${Math.round(sessionDuration / 1000)}s, lastActivity=${sessionPrimitives.lastActivityAt}`,
        );
      } else {
        this.logger.warn(
          `⚠️ No se encontró sesión activa con ID: ${command.sessionId}`,
        );
      }

      this.logger.debug(`🔄 Cerrando sesión en el aggregate...`);

      // Cerrar la sesión
      visitor.endCurrentSession();

      this.logger.debug(`💾 Persistiendo cambios en el repositorio...`);

      // Persistir cambios con eventos
      const visitorContext = this.publisher.mergeObjectContext(visitor);
      const saveResult = await this.visitorRepository.save(visitorContext);

      if (saveResult.isErr()) {
        this.logger.error(
          `❌ Error al guardar visitante: ${saveResult.error.message}`,
        );
        throw new Error('Error al cerrar sesión');
      }

      this.logger.debug(`📡 Publicando eventos de dominio...`);

      // Commit eventos (esto disparará SessionEndedEvent)
      visitorContext.commit();

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ Sesión cerrada exitosamente: sessionId=${command.sessionId}, executionTime=${executionTime}ms`,
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ Error al cerrar sesión: sessionId=${command.sessionId}, executionTime=${executionTime}ms, error=${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
