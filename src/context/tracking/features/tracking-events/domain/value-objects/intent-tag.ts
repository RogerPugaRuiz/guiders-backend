import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para un tag/etiqueta de intención detectada
export class IntentTag extends PrimitiveValueObject<string> {
  constructor(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('IntentTag debe ser un string no vacío');
    }
    super(value);
  }
}
