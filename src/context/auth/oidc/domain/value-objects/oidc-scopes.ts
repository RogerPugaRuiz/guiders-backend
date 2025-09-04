import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Validador para los scopes de OIDC
const validateOidcScopes = (value: string[]) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((scope) => typeof scope === 'string' && scope.trim().length > 0);

export class OidcScopes extends PrimitiveValueObject<string[]> {
  constructor(value: string[]) {
    super(
      value,
      validateOidcScopes,
      'Los scopes de OIDC deben ser un array no vacío de strings válidos',
    );
  }

  static fromPrimitives(scopes: string[]): OidcScopes {
    return new OidcScopes(scopes);
  }

  toPrimitives(): string[] {
    return this.value;
  }

  contains(scope: string): boolean {
    return this.value.includes(scope);
  }
}
