import { VisitorIntent } from '../../domain/visitor-intent';
import { VisitorIntentDetailedResponseDto } from '../dtos/visitor-intent-detailed-response.dto';
import { IntentTagDto } from '../dtos/intent-tag.dto';
import { NavigationPathDto } from '../dtos/navigation-path.dto';

// Mapper para convertir la entidad de dominio VisitorIntent a VisitorIntentDetailedResponseDto
export class VisitorIntentDetailedDtoMapper {
  // Mapea la entidad de dominio a DTO de respuesta
  static toDto(intent: VisitorIntent): VisitorIntentDetailedResponseDto {
    return new VisitorIntentDetailedResponseDto({
      id: intent.id.value,
      visitorId: intent.visitorId.value,
      type: intent.type.value,
      confidence: intent.confidence.value,
      detectedAt: intent.detectedAt.toISOString(),
      description: intent.description ?? '',
      tags: (intent.tags ?? []).map((t) => new IntentTagDto(t.value)),
      priceRange: intent.priceRange ? intent.priceRange.value : undefined,
      navigationPath: new NavigationPathDto(
        intent.navigationPath ? intent.navigationPath.toPrimitives() : [],
      ),
    });
  }

  // Mapea la entidad de dominio a DTO de respuesta, permitiendo sobreescribir la descripción
  static toDtoWithDescription(
    intent: VisitorIntent,
    description: string,
  ): VisitorIntentDetailedResponseDto {
    return new VisitorIntentDetailedResponseDto({
      id: intent.id.value,
      visitorId: intent.visitorId.value,
      type: intent.type.value,
      confidence: intent.confidence.value,
      detectedAt: intent.detectedAt.toISOString(),
      description,
      tags: (intent.tags ?? []).map((t) => new IntentTagDto(t.value)),
      priceRange: intent.priceRange ? intent.priceRange.value : undefined,
      navigationPath: new NavigationPathDto(
        intent.navigationPath ? intent.navigationPath.toPrimitives() : [],
      ),
    });
  }
}
