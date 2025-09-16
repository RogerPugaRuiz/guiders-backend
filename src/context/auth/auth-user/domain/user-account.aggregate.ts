import { UserAccountCreatedAt } from './user-account-created-at';
import { UserAccountEmail } from './user-account-email';
import { UserAccountId } from './user-account-id';
import { UserAccountLastLogin } from './user-account-last-login';
import { UserAccountPassword } from './user-account-password';
import { UserAccountUpdatedAt } from './user-account-updated-at';
import { Optional } from 'src/context/shared/domain/optional';
import { UserAccountRoles } from './value-objects/user-account-roles';
import { Role } from './value-objects/role';
import { AggregateRoot } from '@nestjs/cqrs';
import { UserPasswordUpdatedEvent } from './events/user-password-updated-event';
import { UserAccountCompanyId } from './value-objects/user-account-company-id';
import { UserAccountIsActive } from './value-objects/user-account-is-active';
import { UserAccountCreatedEvent } from './events/user-account-created-event';
import { UserAccountName } from './value-objects/user-account-name';

export interface UserAccountPrimitives {
  id: string;
  email: string;
  name: string;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  roles: string[];
  companyId: string; // Asociación a compañía
  isActive: boolean; // Nuevo campo para estado activo/inactivo
}

export class UserAccount extends AggregateRoot {
  // Propiedades privadas siguiendo convención _xxxx
  private readonly _id: UserAccountId;
  private readonly _email: UserAccountEmail;
  private readonly _name: UserAccountName;
  private readonly _password: UserAccountPassword;
  private readonly _createdAt: UserAccountCreatedAt;
  private readonly _updatedAt: UserAccountUpdatedAt;
  private readonly _lastLoginAt: UserAccountLastLogin;
  private readonly _roles: UserAccountRoles;
  private readonly _companyId: UserAccountCompanyId;
  private readonly _isActive: UserAccountIsActive;

  private constructor(
    id: UserAccountId,
    email: UserAccountEmail,
    name: UserAccountName,
    password: UserAccountPassword,
    createdAt: UserAccountCreatedAt,
    updatedAt: UserAccountUpdatedAt,
    lastLoginAt: UserAccountLastLogin,
    roles: UserAccountRoles,
    companyId: UserAccountCompanyId,
    isActive: UserAccountIsActive = new UserAccountIsActive(true), // Por defecto activo
  ) {
    super();
    this._id = id;
    this._email = email;
    this._name = name;
    this._password = password;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._lastLoginAt = lastLoginAt;
    this._roles = roles;
    this._companyId = companyId;
    this._isActive = isActive;
  }

  // Métodos estáticos de fábrica
  public static create(params: {
    email: UserAccountEmail;
    name: UserAccountName;
    password: UserAccountPassword;
    id?: UserAccountId;
    roles?: UserAccountRoles;
    companyId: UserAccountCompanyId;
    isActive?: UserAccountIsActive;
  }): UserAccount {
    const now = new Date();
    const user = new UserAccount(
      params.id ?? UserAccountId.random(),
      params.email,
      params.name,
      params.password,
      UserAccountCreatedAt.create(now),
      UserAccountUpdatedAt.create(now),
      new UserAccountLastLogin(null),
      params.roles ?? UserAccountRoles.fromRoles([Role.admin()]), // Por defecto admin
      params.companyId,
      params.isActive ?? new UserAccountIsActive(true),
    );
    // Aplica el evento de dominio al crear el usuario
    user.apply(
      new UserAccountCreatedEvent({
        user: user.toPrimitives(),
      }),
    );
    return user;
  }

  public static fromPrimitives(params: {
    id: string;
    email: string;
    name: string;
    password: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
    roles: string[];
    companyId: string;
    isActive?: boolean;
  }): UserAccount {
    const newUser = new UserAccount(
      UserAccountId.create(params.id),
      UserAccountEmail.create(params.email),
      new UserAccountName(params.name),
      new UserAccountPassword(params.password ?? null),
      UserAccountCreatedAt.create(params.createdAt),
      UserAccountUpdatedAt.create(params.updatedAt),
      new UserAccountLastLogin(params.lastLoginAt ?? null),
      UserAccountRoles.fromPrimitives(params.roles),
      UserAccountCompanyId.create(params.companyId),
      new UserAccountIsActive(params.isActive ?? true),
    );

    return newUser;
  }

  // Métodos públicos para exponer los value objects
  get id(): UserAccountId {
    return this._id;
  }
  get email(): UserAccountEmail {
    return this._email;
  }
  get name(): UserAccountName {
    return this._name;
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

  get companyId(): UserAccountCompanyId {
    return this._companyId;
  }

  get isActive(): boolean {
    return this._isActive.value;
  }

  // Métodos públicos
  public equals(userAccount: UserAccount): boolean {
    return (
      this._id.equals(userAccount._id) &&
      this._email.equals(userAccount._email) &&
      this._name.equals(userAccount._name) &&
      this._password.equals(userAccount._password) &&
      this._createdAt.equals(userAccount._createdAt) &&
      this._updatedAt.equals(userAccount._updatedAt) &&
      this._lastLoginAt.equals(userAccount._lastLoginAt) &&
      JSON.stringify(this._roles.toPrimitives()) ===
        JSON.stringify(userAccount._roles.toPrimitives()) &&
      this._companyId.equals(userAccount._companyId) &&
      this._isActive.equals(userAccount._isActive)
    );
  }

  public updateLastLoginAt(): UserAccount {
    return new UserAccount(
      this._id,
      this._email,
      this._name,
      this._password,
      this._createdAt,
      this._updatedAt,
      new UserAccountLastLogin(new Date()),
      this._roles,
      this._companyId,
      this._isActive,
    );
  }

  public updatePassword(password: string): UserAccount {
    // Actualiza la contraseña y aplica el evento de dominio
    const updatedUser = new UserAccount(
      this._id,
      this._email,
      this._name,
      new UserAccountPassword(password),
      this._createdAt,
      this._updatedAt,
      this._lastLoginAt,
      this._roles,
      this._companyId,
      this._isActive,
    );
    this.apply(new UserPasswordUpdatedEvent(this._id.value));
    return updatedUser;
  }

  public toPrimitives(): UserAccountPrimitives {
    return {
      email: this._email.getValue(),
      name: this._name.getValue(),
      password: this._password.getValue(),
      createdAt: this._createdAt.getValue(),
      updatedAt: this._updatedAt.getValue(),
      lastLoginAt: this._lastLoginAt.getValue(),
      roles: this._roles.toPrimitives(),
      id: this._id.getValue(),
      companyId: this._companyId.getValue(),
      isActive: this._isActive.value,
    };
  }
}
