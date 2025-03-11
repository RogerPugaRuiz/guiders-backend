import { Inject, Injectable } from '@nestjs/common';
import {
  USER_TOKEN_SERVICE,
  UserTokenService,
} from '../service/user-token-service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_TOKEN_SERVICE) private readonly tokenService: UserTokenService,
  ) {}

  async execute(refreshToken: string): Promise<{ accessToken: string }> {
    return await this.tokenService.refresh(refreshToken);
  }
}
