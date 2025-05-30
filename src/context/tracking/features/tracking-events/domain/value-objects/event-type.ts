import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el tipo de evento de tracking
// Valida que el tipo de evento sea un string no vacío
const validateEventType = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class EventType extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateEventType, 'El tipo de evento no puede estar vacío');
  }
}
