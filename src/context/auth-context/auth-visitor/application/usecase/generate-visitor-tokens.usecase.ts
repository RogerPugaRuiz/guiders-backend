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
  InvalidDomainError,
  VisitorAccountNotFoundError,
} from '../error/auth-visitor.errors';
import { RegisterVisitor } from './register-visitor.usecase';
import {
  VALIDATE_DOMAIN_API_KEY,
  ValidateDomainApiKey,
} from '../services/validate-domain-api-key';

@Injectable()
export class GenerateVisitorTokens {
  constructor(
    @Inject(AUTH_VISITOR_REPOSITORY)
    private readonly repository: AuthVisitorRepository,
    @Inject(AUTH_VISITOR_TOKEN_SERVICE)
    private readonly tokenService: AuthVisitorTokenService,
    private readonly registerVisitor: RegisterVisitor,
    @Inject(VALIDATE_DOMAIN_API_KEY)
    private readonly validateDomainApiKey: ValidateDomainApiKey,
  ) {}
  async execute(
    client: number,
    domain: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const account = await this.repository.findByClientID(client);

    if (!account) {
      throw new VisitorAccountNotFoundError();
    }
    if (account.clientID.getValue() !== client) {
      throw new ClientNotFoundError();
    }

    const apiKey = account?.apiKey;
    const isValidDomain = await this.validateDomainApiKey.validate({
      apiKey,
      domain,
    });
    if (!isValidDomain) {
      throw new InvalidDomainError(domain);
    }

    const updatedAccount = account.updateLastLoginAt();

    await this.repository.save(updatedAccount);

    const tokens = await this.tokenService.generate(updatedAccount);
    return tokens;
  }
}
