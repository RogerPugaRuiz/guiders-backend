import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class IntegrationApiKeyName extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value, (v) => v.length > 0 && v.length <= 100, 'El nombre debe tener entre 1 y 100 caracteres');
  }

  public static create(value: string): IntegrationApiKeyName {
    return new IntegrationApiKeyName(value);
  }
}
