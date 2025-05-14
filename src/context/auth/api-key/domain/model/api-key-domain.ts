import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class ApiKeyDomain extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (value: string) => {
        // Permite dominios con o sin www. y solo letras, números, guiones, puntos y guion bajo
        const clean = value.startsWith('www.') ? value.substring(4) : value;
        const regex = /^[a-zA-Z0-9._-]+$/;
        return regex.test(clean);
      },
      'Invalid API key domain format',
    );
  }

  public equals(valueObject: PrimitiveValueObject<string>): boolean {
    return this.value === valueObject.value;
  }
}
