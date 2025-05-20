import { VisitorIntent } from 'src/context/tracking/domain/visitor-intent';
import { VisitorIntentPrimitives } from 'src/context/tracking/domain/visitor-intent';

// Mapper para convertir entre la entidad de dominio y la persistencia (ejemplo para TypeORM)
export class VisitorIntentMapper {
  static toPersistence(intent: VisitorIntent): VisitorIntentPrimitives {
    return intent.toPrimitives();
  }

  static fromPersistence(raw: VisitorIntentPrimitives): VisitorIntent {
    return VisitorIntent.fromPrimitives(raw);
  }
}
