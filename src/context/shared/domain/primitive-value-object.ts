import { ValidationError } from './validation.error';

export abstract class PrimitiveValueObject<T> {
  protected value: T;

  protected constructor(
    value: T,
    validate?: (value: T) => boolean,
    errorMessage?: string,
  ) {
    this.value = value;
    if (validate && !validate(this.value) && errorMessage) {
      throw new ValidationError(errorMessage);
    }
  }

  public getValue(): T {
    return this.value;
  }

  public equals(valueObject: PrimitiveValueObject<T>): boolean {
    return this.value === valueObject.getValue();
  }
}
