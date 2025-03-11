import { Injectable } from '@nestjs/common';
import { UserRegisterUseCase } from '../../application/usecases/user-register.usecase';
import { UserLoginUseCase } from '../../application/usecases/user-login.usecase';
import { RefreshTokenUseCase } from '../../application/usecases/refresh-token.usecase';

@Injectable()
export class AuthUserService {
  constructor(
    private readonly userRegister: UserRegisterUseCase,
    private readonly userLogin: UserLoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return await this.userLogin.execute(email, password);
  }

  async register(email: string, password: string): Promise<void> {
    return await this.userRegister.execute(email, password);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    return await this.refreshToken.execute(refreshToken);
  }
}
