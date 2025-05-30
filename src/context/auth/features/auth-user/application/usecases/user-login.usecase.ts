import { Inject, Injectable } from '@nestjs/common';
import {
  USER_PASSWORD_HASHER,
  UserPasswordHasher,
} from '../service/user-password-hasher';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from '../../domain/user-account.repository';
import { UnauthorizedError } from '../errors/unauthorized.error';
import {
  USER_TOKEN_SERVICE,
  UserTokenService,
} from '../service/user-token-service';

@Injectable()
export class UserLoginUseCase {
  constructor(
    @Inject(USER_PASSWORD_HASHER)
    private readonly hasherService: UserPasswordHasher,
    @Inject(USER_TOKEN_SERVICE) private readonly tokenService: UserTokenService,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
  ) {}
  async execute(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.password.isEmpty()) {
      throw new UnauthorizedError('User not found');
    }
    const isValidPassword = await this.hasherService.compare(
      password,
      user.password.get(),
    );
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    const newUserUpdateLastLogin = user.updateLastLoginAt();
    await this.userRepository.save(newUserUpdateLastLogin);

    const tokens = await this.tokenService.generate({
      id: newUserUpdateLastLogin.id.getValue(),
      email: newUserUpdateLastLogin.email.getValue(),
      roles: newUserUpdateLastLogin.roles
        .getValue()
        .map((role) => role.getValue()),
      companyId: newUserUpdateLastLogin.companyId.getValue(),
    });
    return tokens;
  }
}
