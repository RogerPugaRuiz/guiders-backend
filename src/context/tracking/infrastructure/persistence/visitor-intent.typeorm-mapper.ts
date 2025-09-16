import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent.aggregate';
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
      tags: p.tags,
      priceRange: p.priceRange,
      navigationPath: p.navigationPath,
      description: p.description,
    };
  }

  static fromPersistence(entity: VisitorIntentEntity): VisitorIntent {
    return VisitorIntent.fromPrimitives({
      id: entity.id,
      visitorId: entity.visitorId,
      type: entity.type,
      confidence: entity.confidence,
      detectedAt: entity.detectedAt.toISOString(),
      tags: entity.tags,
      priceRange: entity.priceRange,
      navigationPath: entity.navigationPath,
      description: entity.description,
    });
  }
}
