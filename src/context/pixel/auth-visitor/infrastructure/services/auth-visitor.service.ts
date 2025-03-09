import { Injectable } from '@nestjs/common';
import { RegisterVisitor } from '../../application/usecase/register-visitor.usecase';
import { GenerateVisitorTokens } from '../../application/usecase/generate-visitor-tokens.usecase';
import { RefreshVisitorToken } from '../../application/usecase/refresh-visitor-token.usecase';

@Injectable()
export class AuthVisitorService {
  constructor(
    private readonly generateVisitorTokens: GenerateVisitorTokens,
    private readonly registerVisitor: RegisterVisitor,
    private readonly refreshToken: RefreshVisitorToken,
  ) {}
  async tokens(
    client: number,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const tokens = await this.generateVisitorTokens.execute(client);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async register(
    apiKey: string,
    client: number,
    userAgent: string,
  ): Promise<void> {
    return await this.registerVisitor.execute(apiKey, client, userAgent);
  }

  async refresh(refreshToken: string): Promise<{
    acces_token: string;
  }> {
    const token = await this.refreshToken.execute(refreshToken);
    return {
      acces_token: token.accessToken,
    };
  }
}
