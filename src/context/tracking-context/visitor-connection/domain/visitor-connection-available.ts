import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class VisitorConnectionAvailable extends PrimitiveValueObject<boolean> {
  constructor(available: boolean) {
    super(available);
  }

  public static create(available: boolean): VisitorConnectionAvailable {
    return new VisitorConnectionAvailable(available);
  }

  public isAvailable(): boolean {
    return this.value;
  }

  public isNotAvailable(): boolean {
    return !this.value;
  }
}
