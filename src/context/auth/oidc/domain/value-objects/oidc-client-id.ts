import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validador para el Client ID de OIDC
const validateOidcClientId = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class OidcClientId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateOidcClientId,
      'El Client ID de OIDC no puede estar vacío',
    );
  }
}
