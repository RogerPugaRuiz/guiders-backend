import { VisitorIntent } from '../../domain/visitor-intent.aggregate';
import { VisitorIntentDto } from './visitor-intent.dto';

// Mapper para convertir entre VisitorIntent y VisitorIntentDto
export class VisitorIntentDtoMapper {
  static toDto(intent: VisitorIntent): VisitorIntentDto {
    const p = intent.toPrimitives();
    return {
      id: p.id,
      visitorId: p.visitorId,
      type: p.type,
      confidence: p.confidence,
      detectedAt: p.detectedAt,
    };
  }
}
