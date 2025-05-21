import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// DTO de propósito de aplicación para exponer un tag de intención
export class IntentTagDto extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }
}
