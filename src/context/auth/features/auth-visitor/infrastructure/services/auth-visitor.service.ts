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
  async tokens(params: {
    client: number;
    domain: string;
  }): Promise<{ access_token: string; refresh_token: string }> {
    const { client, domain } = params;
    const tokens = await this.generateVisitorTokens.execute(client, domain);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  async register(
    apiKey: string,
    client: number,
    userAgent: string,
    domain: string,
  ): Promise<void> {
    return await this.registerVisitor.execute(
      apiKey,
      client,
      userAgent,
      domain,
    );
  }

  async refresh(refreshToken: string): Promise<{
    access_token: string;
  }> {
    const token = await this.refreshToken.execute(refreshToken);
    return {
      access_token: token.accessToken,
    };
  }
}
