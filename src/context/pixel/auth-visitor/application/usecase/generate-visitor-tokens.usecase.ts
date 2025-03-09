import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_VISITOR_REPOSITORY,
  AuthVisitorRepository,
} from '../../domain/repositories/auth-visitor.repository';
import {
  AUTH_VISITOR_TOKEN_SERVICE,
  AuthVisitorTokenService,
} from '../services/auth-visitor-token-service';
import {
  ClientNotFoundError,
  VisitorAccountNotFoundError,
} from '../error/auth-visitor.errors';

@Injectable()
export class GenerateVisitorTokens {
  constructor(
    @Inject(AUTH_VISITOR_REPOSITORY)
    private readonly repository: AuthVisitorRepository,
    @Inject(AUTH_VISITOR_TOKEN_SERVICE)
    private readonly tokenService: AuthVisitorTokenService,
  ) {}
  async execute(
    client: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const account = await this.repository.findByClientID(client);
    if (!account) {
      throw new VisitorAccountNotFoundError();
    }
    if (account.clientID.getValue() !== client) {
      throw new ClientNotFoundError();
    }

    const updatedAccount = account.updateLastLoginAt();

    await this.repository.save(updatedAccount);

    const tokens = await this.tokenService.generate(updatedAccount);
    return tokens;
  }
}
