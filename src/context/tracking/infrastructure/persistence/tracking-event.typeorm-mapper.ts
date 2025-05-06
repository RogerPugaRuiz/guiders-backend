import { TrackingEvent } from '../../domain/tracking-event';
import { TrackingEventTypeOrmEntity } from './tracking-event.typeorm.entity';

// Mapper para convertir entre la entidad de dominio TrackingEvent y la entidad de infraestructura TrackingEventTypeOrmEntity
export class TrackingEventTypeOrmMapper {
  // Convierte una entidad de dominio a entidad TypeORM
  static toTypeOrmEntity(domain: TrackingEvent): TrackingEventTypeOrmEntity {
    const orm = new TrackingEventTypeOrmEntity();
    const primitives = domain.toPrimitives();
    orm.id = primitives.id;
    orm.visitorId = primitives.visitorId;
    orm.eventType = primitives.eventType;
    orm.metadata = primitives.metadata;
    orm.occurredAt = primitives.occurredAt;
    return orm;
  }

  // Convierte una entidad TypeORM a entidad de dominio
  static toDomainEntity(entity: TrackingEventTypeOrmEntity): TrackingEvent {
    return TrackingEvent.fromPrimitives({
      id: entity.id,
      visitorId: entity.visitorId,
      eventType: entity.eventType,
      metadata: entity.metadata,
      occurredAt: entity.occurredAt,
    });
  }
}
