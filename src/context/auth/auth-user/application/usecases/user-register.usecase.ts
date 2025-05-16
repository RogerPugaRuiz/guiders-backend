import { Inject, Injectable } from '@nestjs/common';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from '../../domain/user-account.repository';
import { UserAlreadyExistsError } from '../errors/user-already-exists.error';
import { UserAccount } from '../../domain/user-account';
import { UserAccountEmail } from '../../domain/user-account-email';
import { UserAccountPassword } from '../../domain/user-account-password';
import { UserAccountRoles } from '../../domain/value-objects/user-account-roles';
import { Role } from '../../domain/value-objects/role';
import { UserAccountCompanyId } from '../../domain/value-objects/user-account-company-id';

import { ValidationError } from 'src/context/shared/domain/validation.error';
import {
  USER_PASSWORD_HASHER,
  UserPasswordHasher,
} from '../service/user-password-hasher';

@Injectable()
export class UserRegisterUseCase {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    @Inject(USER_PASSWORD_HASHER)
    private readonly hasherService: UserPasswordHasher,
  ) {}

  async execute(
    email: string,
    password: string,
    companyId: string, // Se agrega companyId como argumento
    roles: string[],
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (user) {
      throw new UserAlreadyExistsError();
    }
    if (!this.validatePassword(password)) {
      throw new ValidationError(
        'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character',
      );
    }

    if (roles.length === 0) {
      roles = ['commercial'];
    }

    const hash = await this.hasherService.hash(password);
    // Creamos el usuario incluyendo el value object de roles, por defecto solo 'commercial'
    const newUser = UserAccount.create({
      email: UserAccountEmail.create(email),
      password: new UserAccountPassword(hash),
      roles: UserAccountRoles.create(roles.map((role) => Role.create(role))),
      companyId: UserAccountCompanyId.create(companyId),
    });

    return await this.userRepository.save(newUser);
  }

  private validatePassword(value: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]{}|\\:;"'<>,.?/~`-])[A-Za-z\d!@#$%^&*()_+=[\]{}|\\:;"'<>,.?/~`-]{8,}$/.test(
      value,
    );
  }
}
