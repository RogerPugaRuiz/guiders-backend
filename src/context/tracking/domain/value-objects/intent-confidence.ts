import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el nivel de confianza de la intención detectada
export class IntentConfidence extends PrimitiveValueObject<string> {
  static readonly HIGH = 'HIGH';
  static readonly MEDIUM = 'MEDIUM';
  static readonly LOW = 'LOW';

  constructor(value: string) {
    super(
      value,
      (v) =>
        v === IntentConfidence.HIGH ||
        v === IntentConfidence.MEDIUM ||
        v === IntentConfidence.LOW,
      'El nivel de confianza debe ser HIGH, MEDIUM o LOW',
    );
  }
}
