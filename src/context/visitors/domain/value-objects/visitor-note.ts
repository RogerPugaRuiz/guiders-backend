import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Value Object que representa una nota individual de un visitante.
// Valida que la nota no sea vacía ni solo espacios.
export class VisitorNote extends PrimitiveValueObject<string> {
  constructor(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('VisitorNote debe ser un string no vacío');
    }
    super(value);
  }
}
