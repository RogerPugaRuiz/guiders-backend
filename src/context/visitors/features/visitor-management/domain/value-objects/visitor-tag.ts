import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Value Object que representa un tag individual de un visitante.
// Valida que el tag no sea vacío ni solo espacios.
export class VisitorTag extends PrimitiveValueObject<string> {
  constructor(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('VisitorTag debe ser un string no vacío');
    }
    super(value);
  }
}
