import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validador para la URL del endpoint de descubrimiento OIDC
const validateOidcIssuerUrl = (value: string) => {
  try {
    new URL(value);
    return value.startsWith('https://') || value.startsWith('http://');
  } catch {
    return false;
  }
};

export class OidcIssuerUrl extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(value, validateOidcIssuerUrl, 'La URL del issuer OIDC debe ser una URL válida');
  }
}