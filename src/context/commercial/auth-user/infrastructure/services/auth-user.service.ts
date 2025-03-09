import { Injectable } from '@nestjs/common';
import { UserRegisterUseCase } from '../../application/usecases/user-register.usecase';
import { UserLoginUseCase } from '../../application/usecases/user-login.usercase';

@Injectable()
export class AuthUserService {
  constructor(
    private readonly userRegister: UserRegisterUseCase,
    private readonly userLogin: UserLoginUseCase,
  ) {}

  async login(email: string, password: string) {
    return await this.userLogin.execute(email, password);
  }

  async register(email: string, password: string): Promise<void> {
    return await this.userRegister.execute(email, password);
  }
}
