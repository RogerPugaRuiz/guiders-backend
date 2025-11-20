import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value Object para el ID de Keycloak del usuario
 * Representa la referencia única al usuario en Keycloak
 */
export class UserAccountKeycloakId extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      UserAccountKeycloakId.isValidKeycloakId,
      'El Keycloak ID debe ser un UUID válido',
    );
  }

  private static isValidKeycloakId = (id: string): boolean => {
    // Keycloak usa UUIDs para identificar usuarios
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  static fromString(value: string): UserAccountKeycloakId {
    return new UserAccountKeycloakId(value);
  }

  public equals(other: UserAccountKeycloakId): boolean {
    return this.value === other.value;
  }
}
