import { ValidationError } from './validation.error';

export abstract class PrimitiveValueObject<T> {
  readonly value: T;

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

  /**
   * Método de fábrica estático para crear instancias de PrimitiveValueObject.
   * @param value Valor primitivo a encapsular
   * @param validate Función de validación opcional
   * @param errorMessage Mensaje de error opcional
   */
  public static create<
    T extends string | number | Date | Record<string, unknown>,
    V extends PrimitiveValueObject<T>,
  >(
    this: new (
      value: T,
      validate?: (value: T) => boolean,
      errorMessage?: string,
    ) => V,
    value: T,
    validate?: (value: T) => boolean,
    errorMessage?: string,
  ): V {
    return new this(value, validate, errorMessage);
  }
}
