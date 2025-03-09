import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_VISITOR_TOKEN_SERVICE,
  AuthVisitorTokenService,
} from '../services/auth-visitor-token-service';

@Injectable()
export class RefreshVisitorToken {
  constructor(
    @Inject(AUTH_VISITOR_TOKEN_SERVICE)
    private readonly tokenService: AuthVisitorTokenService,
  ) {}

  async execute(refreshToken: string): Promise<{ accessToken: string }> {
    const tokens = await this.tokenService.refresh(refreshToken);
    return tokens;
  }
}
