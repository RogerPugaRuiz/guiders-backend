import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { TrackingVisitor } from '../domain/tracking-visitor';

export class TrackingVisitorMapper {
  static toDomain(entity: TrackingVisitorEntity): TrackingVisitor {
    return TrackingVisitor.fromPrimitives({
      id: entity.id,
      name: entity.visitorName,
      currentUrl: entity.currentUrl,
      connectionDuration: entity.connectionDuration,
      isConnected: entity.isConnected,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(domain: TrackingVisitor): TrackingVisitorEntity {
    const entity = new TrackingVisitorEntity();
    entity.id = domain.id.value;
    entity.visitorName = domain.name?.value || null;
    entity.currentUrl = domain.currentUrl?.value || null;
    entity.connectionDuration = domain.connectionDuration.value;
    entity.isConnected = domain.isConnected.value;
    entity.createdAt = domain.createdAt.value;
    entity.updatedAt = domain.updatedAt.value;
    return entity;
  }
}
