import { PrimitiveValueObject } from '../../../../shared/domain/primitive-value-object';

export class LastMessage extends PrimitiveValueObject<string> {
  static create(value: string): LastMessage {
    return new LastMessage(value);
  }
}
