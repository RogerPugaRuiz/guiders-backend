import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validador para el Client Secret de OIDC
const validateOidcClientSecret = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class OidcClientSecret extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateOidcClientSecret,
      'El Client Secret de OIDC no puede estar vacío',
    );
  }
}
