import { Injectable } from '@nestjs/common';
import { UserRegisterUseCase } from '../../application/usecases/user-register.usecase';
import { UserLoginUseCase } from '../../application/usecases/user-login.usecase';
import { RefreshTokenUseCase } from '../../application/usecases/refresh-token.usecase';
import {
  TokenPayload,
  TokenVerifyService,
} from 'src/context/shared/infrastructure/token-verify.service';

@Injectable()
export class AuthUserService {
  constructor(
    private readonly userRegister: UserRegisterUseCase,
    private readonly userLogin: UserLoginUseCase,
    private readonly refreshToken: RefreshTokenUseCase,
    private readonly validateToken: TokenVerifyService,
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

  async register(
    email: string,
    companyId: string,
    roles?: string[], // roles es opcional para compatibilidad con llamadas antiguas
  ): Promise<void> {
    // Si roles no está definido, se pasa un array vacío por defecto
    return await this.userRegister.execute(email, companyId, roles ?? []);
  }

  async update(): Promise<void> {
    // Implementación de la lógica de actualización de usuario
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    return await this.refreshToken.execute(refreshToken);
  }

  async validate(token: string): Promise<TokenPayload> {
    return await this.validateToken.verifyToken(token);
  }

  // TODO: Implement logout
  // Se omite el parámetro hasta implementar la lógica real para evitar advertencias
  logout(): Promise<void> {
    return Promise.resolve();
  }
}
