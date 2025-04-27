import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { TrackingVisitor } from '../domain/tracking-visitor';

export class TrackingVisitorMapper {
  static toDomain(entity: TrackingVisitorEntity): TrackingVisitor {
    return TrackingVisitor.fromPrimitives({
      id: entity.id,
      name: entity.visitorName,
      currentUrl: entity.lastVisitedUrl, // ahora corresponde a lastVisitedUrl
      connectionDuration: entity.sessionDurationSeconds, // ahora corresponde a sessionDurationSeconds
      ultimateConnectionDate: entity.lastVisitedAt, // ahora corresponde a lastVisitedAt
      isConnected: entity.isConnected,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastVisitedUrl: entity.lastVisitedUrl,
      lastVisitedAt: entity.lastVisitedAt,
      pageViews: entity.pageViews,
      sessionDurationSeconds: entity.sessionDurationSeconds,
    });
  }

  static toEntity(domain: TrackingVisitor): TrackingVisitorEntity {
    const entity = new TrackingVisitorEntity();
    entity.id = domain.id.value;
    entity.visitorName = domain.name?.value || null;
    entity.lastVisitedUrl = domain.lastVisitedUrl?.value || null;
    entity.lastVisitedAt = domain.lastVisitedAt?.value || null;
    entity.isConnected = domain.isConnected.value;
    entity.pageViews = domain.pageViews.value;
    entity.sessionDurationSeconds = domain.sessionDurationSeconds.value;
    entity.createdAt = domain.createdAt.value;
    entity.updatedAt = domain.updatedAt.value;
    return entity;
  }
}
