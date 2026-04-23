import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Representa el token de la API Key de integración.
 * Formato: gdr_live_<32 hex chars> o gdr_test_<32 hex chars>
 * El valor almacenado es el hash SHA-256 del token original.
 * El token en claro solo se devuelve una vez al crearlo.
 */
export class IntegrationApiKeyToken extends PrimitiveValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  public static create(value: string): IntegrationApiKeyToken {
    return new IntegrationApiKeyToken(value);
  }
}
