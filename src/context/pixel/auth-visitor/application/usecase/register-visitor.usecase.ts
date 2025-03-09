import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_VISITOR_REPOSITORY,
  AuthVisitorRepository,
} from '../../domain/repositories/auth-visitor.repository';
import { VisitorAccount } from '../../domain/models/visitor-account';
import { VisitorAccountApiKey } from '../../domain/models/visitor-account-api-key';
import { VisitorAccountClientID } from '../../domain/models/visitor-account-client-id';
import { VisitorAccountUserAgent } from '../../domain/models/visitor-account-user-agent';
import { VisitorAccountAlreadyExistError } from '../error/auth-visitor.errors';

@Injectable()
export class RegisterVisitor {
  constructor(
    @Inject(AUTH_VISITOR_REPOSITORY)
    private readonly repository: AuthVisitorRepository,
  ) {}

  async execute(
    apiKey: string,
    client: number,
    userAgent: string,
  ): Promise<void> {
    const findAccount = await this.repository.findByClientID(client);
    if (findAccount) {
      throw new VisitorAccountAlreadyExistError();
    }

    const newAccount = VisitorAccount.create({
      apiKey: VisitorAccountApiKey.create(apiKey),
      clientID: VisitorAccountClientID.create(client),
      userAgent: VisitorAccountUserAgent.create(userAgent),
    });
    await this.repository.save(newAccount);
  }
}
