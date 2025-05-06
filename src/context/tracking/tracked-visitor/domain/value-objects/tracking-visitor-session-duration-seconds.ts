import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Valida que la duración de la sesión sea un entero no negativo
const validateSessionDurationSeconds = (value: number): boolean =>
  Number.isInteger(value) && value >= 0;

// Value Object para la duración de la sesión en segundos
export class TrackingVisitorSessionDurationSeconds extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(
      value,
      validateSessionDurationSeconds,
      'TrackingVisitorSessionDurationSeconds debe ser un entero no negativo',
    );
  }
}
