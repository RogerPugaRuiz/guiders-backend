import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validador para el ID del proveedor OIDC
const validateOidcProviderId = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class OidcProviderId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateOidcProviderId,
      'El ID del proveedor OIDC no puede estar vacío',
    );
  }
}
