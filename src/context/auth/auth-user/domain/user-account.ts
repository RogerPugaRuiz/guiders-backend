import { UserAccountCreatedAt } from './user-account-created-at';
import { UserAccountEmail } from './user-account-email';
import { UserAccountId } from './user-account-id';
import { UserAccountLastLogin } from './user-account-last-login';
import { UserAccountPassword } from './user-account-password';
import { UserAccountUpdatedAt } from './user-account-updated-at';
import { Optional } from 'src/context/shared/domain/optional';
import { UserAccountRoles } from './value-objects/user-account-roles';
import { Role } from './value-objects/role';

export interface UserAccountPrimitives {
  id: string;
  email: string;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  roles: string[];
}

export class UserAccount {
  // Propiedades privadas siguiendo convención _xxxx
  private readonly _id: UserAccountId;
  private readonly _email: UserAccountEmail;
  private readonly _password: UserAccountPassword;
  private readonly _createdAt: UserAccountCreatedAt;
  private readonly _updatedAt: UserAccountUpdatedAt;
  private readonly _lastLoginAt: UserAccountLastLogin;
  private readonly _roles: UserAccountRoles;

  private constructor(
    id: UserAccountId,
    email: UserAccountEmail,
    password: UserAccountPassword,
    createdAt: UserAccountCreatedAt,
    updatedAt: UserAccountUpdatedAt,
    lastLoginAt: UserAccountLastLogin,
    roles: UserAccountRoles,
  ) {
    this._id = id;
    this._email = email;
    this._password = password;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._lastLoginAt = lastLoginAt;
    this._roles = roles;
  }

  // Métodos estáticos de fábrica
  public static create(params: {
    email: UserAccountEmail;
    password: UserAccountPassword;
    roles?: UserAccountRoles;
  }): UserAccount {
    const now = new Date();
    return new UserAccount(
      UserAccountId.random(),
      params.email,
      params.password,
      UserAccountCreatedAt.create(now),
      UserAccountUpdatedAt.create(now),
      new UserAccountLastLogin(null),
      params.roles ?? UserAccountRoles.fromRoles([Role.admin()]), // Por defecto admin
    );
  }

  public static fromPrimitives(params: {
    id: string;
    email: string;
    password: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
    roles: string[];
  }): UserAccount {
    return new UserAccount(
      UserAccountId.create(params.id),
      UserAccountEmail.create(params.email),
      new UserAccountPassword(params.password ?? null),
      UserAccountCreatedAt.create(params.createdAt),
      UserAccountUpdatedAt.create(params.updatedAt),
      new UserAccountLastLogin(params.lastLoginAt ?? null),
      UserAccountRoles.fromPrimitives(params.roles),
    );
  }

  // Métodos públicos para exponer los value objects
  get id(): UserAccountId {
    return this._id;
  }
  get email(): UserAccountEmail {
    return this._email;
  }
  // Getter que expone password como Optional
  get password(): Optional<string> {
    return this._password.value === null
      ? Optional.empty()
      : Optional.of(this._password.getValue()!);
  }

  get createdAt(): UserAccountCreatedAt {
    return this._createdAt;
  }
  get updatedAt(): UserAccountUpdatedAt {
    return this._updatedAt;
  }
  // Getter que expone lastLoginAt como Optional
  get lastLoginAt(): Optional<Date> {
    return this._lastLoginAt.value === null
      ? Optional.empty()
      : Optional.of(this._lastLoginAt.getValue()!);
  }

  // Getter para roles
  get roles(): UserAccountRoles {
    return this._roles;
  }

  // Métodos públicos
  public equals(userAccount: UserAccount): boolean {
    return (
      this._id.equals(userAccount._id) &&
      this._email.equals(userAccount._email) &&
      this._password.equals(userAccount._password) &&
      this._createdAt.equals(userAccount._createdAt) &&
      this._updatedAt.equals(userAccount._updatedAt) &&
      this._lastLoginAt.equals(userAccount._lastLoginAt) &&
      JSON.stringify(this._roles.toPrimitives()) ===
        JSON.stringify(userAccount._roles.toPrimitives())
    );
  }

  public updateLastLoginAt(): UserAccount {
    return new UserAccount(
      this._id,
      this._email,
      this._password,
      this._createdAt,
      this._updatedAt,
      new UserAccountLastLogin(new Date()),
      this._roles,
    );
  }

  public toPrimitives(): UserAccountPrimitives {
    return {
      email: this._email.getValue(),
      password: this._password.getValue(),
      createdAt: this._createdAt.getValue(),
      updatedAt: this._updatedAt.getValue(),
      lastLoginAt: this._lastLoginAt.getValue(),
      roles: this._roles.toPrimitives(),
      id: this._id.getValue(),
    };
  }
}
