import { EventsHandler, IEventHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SessionEndedEvent } from '../../domain/events/session.events';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { VisitorId } from '../../domain/value-objects/visitor-id';

/**
 * Event handler que cambia el estado del visitante a offline cuando se cierra su sesión
 *
 * Flujo:
 * 1. Escucha SessionEndedEvent (cuando se cierra una sesión de visitante)
 * 2. Verifica si el visitante tiene otras sesiones activas
 * 3. Si no tiene más sesiones activas, marca al visitante como offline
 * 4. Esto dispara VisitorConnectionChangedEvent → PresenceChangedEvent → Notificación WebSocket
 *
 * Patrón: Process Manager / Saga
 *
 * Este handler permite que el frontend solo llame a POST /visitors/session/end
 * y automáticamente se notifica a los comerciales del cambio de estado.
 */
@EventsHandler(SessionEndedEvent)
export class ChangeVisitorToOfflineOnSessionEndedEventHandler
  implements IEventHandler<SessionEndedEvent>
{
  private readonly logger = new Logger(
    ChangeVisitorToOfflineOnSessionEndedEventHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    private readonly publisher: EventPublisher,
  ) {}

  async handle(event: SessionEndedEvent): Promise<void> {
    try {
      const { visitorId, sessionId, duration } = event.attributes;

      this.logger.debug(
        `Sesión cerrada: visitorId=${visitorId}, sessionId=${sessionId}, duration=${duration}ms`,
      );

      // Obtener el visitante para verificar si tiene otras sesiones activas
      const visitorIdVO = new VisitorId(visitorId);
      const visitorResult = await this.visitorRepository.findById(visitorIdVO);

      if (visitorResult.isErr()) {
        this.logger.warn(
          `No se encontró visitante ${visitorId} para actualizar estado después de cerrar sesión`,
        );
        return;
      }

      const visitor = visitorResult.unwrap();

      // Verificar si aún tiene sesiones activas
      const hasActiveSessions = visitor.hasActiveSessions();

      if (hasActiveSessions) {
        this.logger.debug(
          `Visitante ${visitorId} aún tiene sesiones activas, no se marca como offline`,
        );
        return;
      }

      // No tiene sesiones activas, marcar como offline
      this.logger.log(
        `Visitante ${visitorId} no tiene sesiones activas, marcando como offline`,
      );

      // Merge con EventPublisher para que los eventos se publiquen
      const aggCtx = this.publisher.mergeObjectContext(visitor);

      // Cambiar estado a offline (emite VisitorConnectionChangedEvent)
      aggCtx.goOffline();

      // Persistir cambios
      const saveResult = await this.visitorRepository.save(aggCtx);

      if (saveResult.isErr()) {
        this.logger.error(
          `Error al guardar visitante ${visitorId}: ${saveResult.error.message}`,
        );
        return;
      }

      // CRITICAL: Publicar eventos de dominio
      // Esto dispara VisitorConnectionChangedEvent → PresenceChangedEvent → WebSocket
      aggCtx.commit();

      this.logger.log(
        `Estado de conexión actualizado a offline para visitante ${visitorId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al cambiar visitante a offline después de cerrar sesión: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
