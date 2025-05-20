import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el tipo de intención detectada
export class IntentType extends PrimitiveValueObject<string> {
  // Tipos permitidos de intención
  static readonly PURCHASE = 'PURCHASE';
  static readonly RESEARCH = 'RESEARCH';

  constructor(value: string) {
    super(
      value,
      (v) => v === IntentType.PURCHASE || v === IntentType.RESEARCH,
      'El tipo de intención debe ser PURCHASE o RESEARCH',
    );
  }
}
