import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent';
import { VisitorIntentDetailedPrimitives } from 'src/context/tracking/domain/visitor-intent';

// Mapper para convertir entre la entidad de dominio y la persistencia (ejemplo para TypeORM)
export class VisitorIntentMapper {
  static toPersistence(intent: VisitorIntent): VisitorIntentDetailedPrimitives {
    return intent.toPrimitives();
  }

  static fromPersistence(raw: VisitorIntentDetailedPrimitives): VisitorIntent {
    return VisitorIntent.fromPrimitives(raw);
  }
}
