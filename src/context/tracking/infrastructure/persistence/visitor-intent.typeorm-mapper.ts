import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent';
import { VisitorIntentEntity } from './entity/visitor-intent.entity';

// Mapper para convertir entre la entidad de dominio y la entidad de persistencia
export class VisitorIntentTypeOrmMapper {
  static toPersistence(domain: VisitorIntent): VisitorIntentEntity {
    const p = domain.toPrimitives();
    return {
      id: p.id,
      visitorId: p.visitorId,
      type: p.type,
      confidence: p.confidence,
      detectedAt: new Date(p.detectedAt),
    };
  }

  static fromPersistence(entity: VisitorIntentEntity): VisitorIntent {
    return VisitorIntent.fromPrimitives({
      id: entity.id,
      visitorId: entity.visitorId,
      type: entity.type,
      confidence: entity.confidence,
      detectedAt: entity.detectedAt.toISOString(),
    });
  }
}
