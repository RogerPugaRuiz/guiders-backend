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
import { QueryBus } from '@nestjs/cqrs';
import { FindCompanyByDomainResponseDto } from 'src/context/company/application/dtos/find-company-by-domain-response.dto';
import { FindCompanyByDomainQuery } from 'src/context/company/application/queries/find-company-by-domain.query';

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
    private readonly queryBus: QueryBus,
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

    const query = new FindCompanyByDomainQuery(domain);
    const result = await this.queryBus.execute<
      FindCompanyByDomainQuery,
      FindCompanyByDomainResponseDto | null
    >(query);

    if (!result) {
      throw new InvalidDomainError(domain);
    }

    const tokens = await this.tokenService.generate(updatedAccount, result.id);
    return tokens;
  }
}
