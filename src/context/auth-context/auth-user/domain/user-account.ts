import { Optional } from 'src/context/shared/domain/optional';
import { UserAccountCreatedAt } from './user-account-created-at';
import { UserAccountEmail } from './user-account-email';
import { UserAccountId } from './user-account-id';
import { UserAccountLastLogin } from './user-account-last-login';
import { UserAccountPassword } from './user-account-password';
import { UserAccountUpdatedAt } from './user-account-updated-at';

export class UserAccount {
  private constructor(
    public readonly id: UserAccountId,
    public readonly email: UserAccountEmail,
    public readonly password: UserAccountPassword,
    public readonly createdAt: UserAccountCreatedAt,
    public readonly updatedAt: UserAccountUpdatedAt,
    public readonly lastLoginAt: Optional<UserAccountLastLogin>,
  ) {}

  // Métodos estáticos
  public static create(params: {
    email: UserAccountEmail;
    password: UserAccountPassword;
  }): UserAccount {
    const now = new Date();
    const newUser = new UserAccount(
      UserAccountId.random(),
      params.email,
      params.password,
      UserAccountCreatedAt.create(now),
      UserAccountUpdatedAt.create(now),
      Optional.empty(),
    );
    return newUser;
  }

  public static fromPrimitives(params: {
    id: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
  }): UserAccount {
    return new UserAccount(
      UserAccountId.create(params.id),
      UserAccountEmail.create(params.email),
      UserAccountPassword.create(params.password),
      UserAccountCreatedAt.create(params.createdAt),
      UserAccountUpdatedAt.create(params.updatedAt),
      this.createOptionalLastLogin(params.lastLoginAt),
    );
  }

  // Métodos públicos
  public equals(userAccount: UserAccount): boolean {
    return (
      this.id.equals(userAccount.id) &&
      this.email.equals(userAccount.email) &&
      this.password.equals(userAccount.password) &&
      this.createdAt.equals(userAccount.createdAt) &&
      this.updatedAt.equals(userAccount.updatedAt) &&
      this.compareLastLoginAt(userAccount)
    );
  }

  public updateLastLoginAt(): UserAccount {
    return new UserAccount(
      this.id,
      this.email,
      this.password,
      this.createdAt,
      this.updatedAt,
      Optional.of(UserAccountLastLogin.create(new Date())),
    );
  }

  public toPrimitives(): {
    id: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
  } {
    return {
      id: this.id.getValue(),
      email: this.email.getValue(),
      password: this.password.getValue(),
      createdAt: this.createdAt.getValue(),
      updatedAt: this.updatedAt.getValue(),
      lastLoginAt: this.lastLoginAt.isDefined()
        ? this.lastLoginAt.get().getValue()
        : null,
    };
  }

  // Métodos privados
  private static createOptionalLastLogin(
    lastLoginAt?: Date | null,
  ): Optional<UserAccountLastLogin> {
    return lastLoginAt
      ? Optional.of(UserAccountLastLogin.create(lastLoginAt))
      : Optional.empty();
  }

  private compareLastLoginAt(userAccount: UserAccount): boolean {
    return (
      this.lastLoginAt.isDefined() === userAccount.lastLoginAt.isDefined() &&
      (!this.lastLoginAt.isDefined() ||
        this.lastLoginAt.get().equals(userAccount.lastLoginAt.get()))
    );
  }
}
