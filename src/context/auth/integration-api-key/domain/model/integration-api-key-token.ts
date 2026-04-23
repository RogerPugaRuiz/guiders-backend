import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Representa el token hasheado de la API Key de integración.
 * El valor almacenado es el hash SHA-256 del token original.
 * El token en claro solo se devuelve una vez al crearlo.
 */
export class IntegrationApiKeyToken extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  public static of(value: string): IntegrationApiKeyToken {
    return new IntegrationApiKeyToken(value);
  }
}
