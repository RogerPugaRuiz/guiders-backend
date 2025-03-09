import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountApiKey extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  public static create(value: string): VisitorAccountApiKey {
    return new VisitorAccountApiKey(value);
  }
}
