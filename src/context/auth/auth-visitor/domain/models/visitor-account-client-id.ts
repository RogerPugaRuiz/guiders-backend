import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorAccountClientID extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(value, (v) => Number.isInteger(v) && v > 0, 'Invalid Client ID');
  }

  static create(value: number): VisitorAccountClientID {
    return new VisitorAccountClientID(value);
  }
}
