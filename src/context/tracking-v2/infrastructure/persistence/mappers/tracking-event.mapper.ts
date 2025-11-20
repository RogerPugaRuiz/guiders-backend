import { TrackingEvent } from '../../../domain/tracking-event.aggregate';
import { TrackingEventMongoEntity } from '../entity/tracking-event-mongo.entity';

/**
 * Mapper para convertir entre el agregado de dominio TrackingEvent
 * y la entidad de persistencia MongoDB
 */
export class TrackingEventMapper {
  /**
   * Convierte de entidad de dominio a entidad de persistencia
   */
  static toPersistence(
    event: TrackingEvent,
  ): Partial<TrackingEventMongoEntity> {
    const primitives = event.toPrimitives();

    return {
      id: primitives.id,
      visitorId: primitives.visitorId,
      sessionId: primitives.sessionId,
      tenantId: primitives.tenantId,
      siteId: primitives.siteId,
      eventType: primitives.eventType,
      metadata: primitives.metadata,
      occurredAt: new Date(primitives.occurredAt),
      count: primitives.count || 1,
    };
  }

  /**
   * Convierte de entidad de persistencia a entidad de dominio
   */
  static fromPersistence(entity: TrackingEventMongoEntity): TrackingEvent {
    return TrackingEvent.fromPrimitives({
      id: entity.id,
      visitorId: entity.visitorId,
      sessionId: entity.sessionId,
      tenantId: entity.tenantId,
      siteId: entity.siteId,
      eventType: entity.eventType,
      metadata: entity.metadata,
      occurredAt: entity.occurredAt.toISOString(),
      count: entity.count || 1,
    });
  }

  /**
   * Convierte múltiples entidades de persistencia a dominio
   * Útil para queries que retornan arrays
   */
  static fromPersistenceArray(
    entities: TrackingEventMongoEntity[],
  ): TrackingEvent[] {
    return entities.map((entity) => this.fromPersistence(entity));
  }

  /**
   * Convierte múltiples entidades de dominio a persistencia
   * Útil para batch inserts
   */
  static toPersistenceArray(
    events: TrackingEvent[],
  ): Partial<TrackingEventMongoEntity>[] {
    return events.map((event) => this.toPersistence(event));
  }
}
