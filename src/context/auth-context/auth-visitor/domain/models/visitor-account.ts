import { Optional } from 'src/context/shared/domain/optional';
import { VisitorAccountCreatedAt } from './visitor-account-created-at';
import { VisitorAccountId } from './visitor-account-id';
import { VisitorAccountLastLoginAt } from './visitor-account-last-login-at';
import { VisitorAccountClientID } from './visitor-account-client-id';
import { VisitorAccountUserAgent } from './visitor-account-user-agent';
import { VisitorAccountApiKey } from './visitor-account-api-key';

export interface VisitorAccountPrimitives {
  id: string;
  clientID: number;
  userAgent: string;
  createdAt: Date;
  apiKey: string;
  lastLoginAt: Date | null | undefined;
}

export class VisitorAccount {
  private constructor(
    readonly id: VisitorAccountId,
    readonly clientID: VisitorAccountClientID,
    readonly userAgent: VisitorAccountUserAgent,
    readonly createdAt: VisitorAccountCreatedAt,
    readonly apiKey: VisitorAccountApiKey,
    readonly lastLoginAt: Optional<VisitorAccountLastLoginAt>,
  ) {}

  static create(params: {
    clientID: VisitorAccountClientID;
    userAgent: VisitorAccountUserAgent;
    apiKey: VisitorAccountApiKey;
  }): VisitorAccount {
    return new VisitorAccount(
      VisitorAccountId.random(),
      params.clientID,
      params.userAgent,
      VisitorAccountCreatedAt.now(),
      params.apiKey,
      Optional.empty(),
    );
  }

  static fromPrimitives(params: {
    id: string;
    clientID: number;
    userAgent: string;
    createdAt: Date;
    apiKey: string;
    lastLoginAt: Date | null | undefined;
  }): VisitorAccount {
    return new VisitorAccount(
      VisitorAccountId.create(params.id),
      VisitorAccountClientID.create(params.clientID),
      VisitorAccountUserAgent.create(params.userAgent),
      VisitorAccountCreatedAt.create(params.createdAt),
      VisitorAccountApiKey.create(params.apiKey),
      VisitorAccount.createOptionalLastLogin(params.lastLoginAt),
    );
  }

  equals(visitorAccount: VisitorAccount): boolean {
    return (
      this.id.equals(visitorAccount.id) &&
      this.clientID.equals(visitorAccount.clientID) &&
      this.userAgent.equals(visitorAccount.userAgent) &&
      this.createdAt.equals(visitorAccount.createdAt) &&
      this.apiKey.equals(visitorAccount.apiKey) &&
      this.compareLastLoginAt(visitorAccount)
    );
  }

  toPrimitives(): VisitorAccountPrimitives {
    return {
      id: this.id.getValue(),
      clientID: this.clientID.getValue(),
      userAgent: this.userAgent.getValue(),
      createdAt: this.createdAt.getValue(),
      apiKey: this.apiKey.getValue(),
      lastLoginAt: this.lastLoginAt
        .map((value) => value.getValue())
        .getOrNull(),
    };
  }

  updateLastLoginAt(): VisitorAccount {
    return new VisitorAccount(
      this.id,
      this.clientID,
      this.userAgent,
      this.createdAt,
      this.apiKey,
      Optional.of(VisitorAccountLastLoginAt.now()),
    );
  }

  private static createOptionalLastLogin(
    lastLoginAt?: Date | null,
  ): Optional<VisitorAccountLastLoginAt> {
    return lastLoginAt
      ? Optional.of(VisitorAccountLastLoginAt.create(lastLoginAt))
      : Optional.empty();
  }

  private compareLastLoginAt(visitorAccount: VisitorAccount): boolean {
    return this.lastLoginAt.equals(visitorAccount.lastLoginAt);
  }
}
