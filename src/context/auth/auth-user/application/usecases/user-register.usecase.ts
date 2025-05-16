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

import {
  USER_PASSWORD_HASHER,
  UserPasswordHasher,
} from '../service/user-password-hasher';
import { EventPublisher } from '@nestjs/cqrs';

@Injectable()
export class UserRegisterUseCase {
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    @Inject(USER_PASSWORD_HASHER)
    private readonly hasherService: UserPasswordHasher,
    private readonly publisher: EventPublisher, // Inyectamos el publisher para publicar eventos de dominio
  ) {}

  async execute(
    email: string,
    companyId: string, // Se agrega companyId como argumento
    roles: string[],
  ): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (user) {
      throw new UserAlreadyExistsError();
    }

    if (roles.length === 0) {
      roles = ['commercial'];
    }

    // Creamos el usuario incluyendo el value object de roles, por defecto solo 'commercial'
    const newUser = UserAccount.create({
      email: UserAccountEmail.create(email),
      roles: UserAccountRoles.create(roles.map((role) => Role.create(role))),
      companyId: UserAccountCompanyId.create(companyId),
      password: UserAccountPassword.empty(),
    });

    // Publicamos los eventos de dominio aplicados en el aggregate
    // Esto permite que los event handlers reaccionen a los eventos generados por el usuario
    const userContext = this.publisher.mergeObjectContext(newUser);
    await this.userRepository.save(userContext);
    userContext.commit();
  }

  private validatePassword(value: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]{}|\\:;"'<>,.?/~`-])[A-Za-z\d!@#$%^&*()_+=[\]{}|\\:;"'<>,.?/~`-]{8,}$/.test(
      value,
    );
  }
}
