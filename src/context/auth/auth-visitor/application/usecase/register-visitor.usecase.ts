import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AUTH_VISITOR_REPOSITORY,
  AuthVisitorRepository,
} from '../../domain/repositories/auth-visitor.repository';
import { VisitorAccount } from '../../domain/models/visitor-account';
import { VisitorAccountApiKey } from '../../domain/models/visitor-account-api-key';
import { VisitorAccountClientID } from '../../domain/models/visitor-account-client-id';
import { VisitorAccountUserAgent } from '../../domain/models/visitor-account-user-agent';
import {
  InvalidDomainError,
  VisitorAccountAlreadyExistError,
} from '../error/auth-visitor.errors';
import {
  VALIDATE_DOMAIN_API_KEY,
  ValidateDomainApiKey,
} from '../services/validate-domain-api-key';
import { EventPublisher } from '@nestjs/cqrs';

@Injectable()
export class RegisterVisitor {
  private readonly logger = new Logger(RegisterVisitor.name);
  constructor(
    @Inject(AUTH_VISITOR_REPOSITORY)
    private readonly repository: AuthVisitorRepository,
    @Inject(VALIDATE_DOMAIN_API_KEY)
    private readonly validateDomainApiKey: ValidateDomainApiKey,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    apiKey: string,
    client: number,
    userAgent: string,
    domain: string,
  ): Promise<void> {
    const apiKeyValue = VisitorAccountApiKey.create(apiKey);
    const clientIDValue = VisitorAccountClientID.create(client);
    const userAgentValue = VisitorAccountUserAgent.create(userAgent);

    this.logger.log('domain: ' + domain);
    const isValid = await this.validateDomainApiKey.validate({
      apiKey: apiKeyValue,
      domain,
    });

    if (!isValid) {
      throw new InvalidDomainError(domain);
    }

    const findAccount = await this.repository.findByClientID(client);
    if (findAccount) {
      throw new VisitorAccountAlreadyExistError();
    }

    const newAccount = VisitorAccount.create({
      apiKey: apiKeyValue,
      clientID: clientIDValue,
      userAgent: userAgentValue,
    });

    const newAccountWithPublisher =
      this.publisher.mergeObjectContext(newAccount);
    await this.repository.save(newAccountWithPublisher);
    newAccountWithPublisher.commit();
  }
}
