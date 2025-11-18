/**
 * Value Object para la URL del avatar del usuario
 * Puede ser null si el usuario no tiene avatar
 */
export class UserAccountAvatarUrl {
  constructor(public readonly value: string | null) {}

  public getValue(): string | null {
    return this.value;
  }

  public hasAvatar(): boolean {
    return this.value !== null && this.value.trim() !== '';
  }

  public equals(other: UserAccountAvatarUrl): boolean {
    return this.value === other.value;
  }
}
