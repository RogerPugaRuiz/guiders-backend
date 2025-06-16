import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyDomain extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (value: string) => {
        // La validación permite dominios que contengan letras, números, guiones, puntos y guión bajo
        // Los dominios con www. son válidos y se normalizan en los casos de uso
        const regex = /^[a-zA-Z0-9._-]+$/;
        return regex.test(value);
      },
      'Invalid API key domain format',
    );
  }

  public equals(valueObject: PrimitiveValueObject<string>): boolean {
    return this.value === valueObject.value;
  }
}
