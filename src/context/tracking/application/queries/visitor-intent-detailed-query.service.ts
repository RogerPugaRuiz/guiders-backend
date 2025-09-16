import { VisitorIntent } from '../../domain/visitor-intent.aggregate';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { VisitorIntentDomainError } from '../../domain/visitor-intent-domain.error';
import { VisitorIntentDetailedResponseDto } from '../dtos/visitor-intent-detailed-response.dto';
import { VisitorIntentDetailedDtoMapper } from '../dtos/visitor-intent-detailed-dto.mapper';
import { DomainError } from 'src/context/shared/domain/domain.error';

// Servicio de dominio para construir la descripción de la intención
export class VisitorIntentDescriptionService {
  // Construye una descripción textual a partir de la intención
  static buildDescription(intent: VisitorIntent): string {
    // Ejemplo simple: puedes personalizar según reglas de negocio
    if (intent.type.value === 'PURCHASE') {
      return `El visitante tiene intención de compra con confianza ${intent.confidence.value.toLowerCase()}`;
    }
    if (intent.type.value === 'RESEARCH') {
      return `El visitante está investigando productos con confianza ${intent.confidence.value.toLowerCase()}`;
    }
    return 'Intención detectada';
  }
}

// Servicio de aplicación para obtener la intención detallada
export class VisitorIntentDetailedQueryService {
  // Recibe la entidad de dominio y retorna el DTO de respuesta
  static toDetailedResponse(
    intent: VisitorIntent,
  ): Result<VisitorIntentDetailedResponseDto, DomainError> {
    try {
      // Construir descripción para el DTO, sin mutar la entidad
      const description = intent.description
        ? intent.description
        : VisitorIntentDescriptionService.buildDescription(intent);

      // Mapear a DTO pasando la descripción generada explícitamente
      return ok(
        VisitorIntentDetailedDtoMapper.toDtoWithDescription(
          intent,
          description,
        ),
      );
    } catch (error) {
      return err(
        new VisitorIntentDomainError(
          'Error al construir la respuesta detallada de intención: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }
}
