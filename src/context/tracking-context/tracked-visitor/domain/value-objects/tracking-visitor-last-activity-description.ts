import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validación: Verifica que el valor sea un string no vacío
const validateLastActivityDescription = (value: string): boolean =>
  typeof value === 'string' && value.trim().length > 0;

export class TrackingVisitorLastActivityDescription extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateLastActivityDescription,
      'TrackingVisitorLastActivityDescription must be a non-empty string',
    );
  }
}
