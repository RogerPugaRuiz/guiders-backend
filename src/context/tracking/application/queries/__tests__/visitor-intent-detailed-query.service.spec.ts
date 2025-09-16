import { VisitorIntentDetailedQueryService } from '../visitor-intent-detailed-query.service';
import { VisitorIntent } from '../../../domain/visitor-intent.aggregate';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { IntentType } from '../../../domain/value-objects/intent-type';
import { IntentConfidence } from '../../../domain/value-objects/intent-confidence';
// import { VisitorIntentDetailedResponseDto } from '../../dtos/visitor-intent-detailed-response.dto';
import { VisitorIntentDomainError } from '../../../domain/visitor-intent-domain.error';

describe('VisitorIntentDetailedQueryService', () => {
  it('debe construir un DTO detallado correctamente', () => {
    // Usar Uuid.random() para asegurar un UUID válido
    const uuid = Uuid.random();
    const visitorId = Uuid.random().value;
    const intent = VisitorIntent.create({
      id: uuid,
      visitorId: VisitorId.create(visitorId),
      type: new IntentType('PURCHASE'),
      confidence: new IntentConfidence('HIGH'),
      detectedAt: new Date(),
    });
    const result = VisitorIntentDetailedQueryService.toDetailedResponse(intent);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap().visitorId).toBe(visitorId);
    }
  });

  it('debe devolver un error de dominio si ocurre una excepción', () => {
    // Simular un intent inválido forzando un error
    const intent = undefined as unknown as VisitorIntent;
    const result = VisitorIntentDetailedQueryService.toDetailedResponse(intent);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(VisitorIntentDomainError);
    }
  });
});
