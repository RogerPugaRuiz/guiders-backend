import { ApiKeyCreatedAt } from './api-key-created-at';
import { ApiKeyDomain } from './api-key-domain';
import { ApiKeyId } from './api-key-id';
import { ApiKeyKid } from './api-key-kid';
import { ApiKeyPrivateKey } from './api-key-private-key';
import { ApiKeyPublicKey } from './api-key-public-key';
import { ApiKeyValue } from './api-key-value';
import { ApiKeyCompanyId } from './api-key-company-id';

export class ApiKey {
  private constructor(
    public readonly id: ApiKeyId,
    public readonly apiKey: ApiKeyValue,
    public readonly kid: ApiKeyKid,
    public readonly domain: ApiKeyDomain,
    public readonly publicKey: ApiKeyPublicKey,
    public readonly privateKey: ApiKeyPrivateKey,
    public readonly companyId: ApiKeyCompanyId,
    public readonly createdAt: ApiKeyCreatedAt,
  ) {}

  public static create(params: {
    domain: ApiKeyDomain;
    publicKey: ApiKeyPublicKey;
    privateKey: ApiKeyPrivateKey;
    apiKey: ApiKeyValue;
    kid: ApiKeyKid;
    companyId: ApiKeyCompanyId;
  }): ApiKey {
    return new ApiKey(
      ApiKeyId.random(),
      params.apiKey,
      params.kid,
      params.domain,
      params.publicKey,
      params.privateKey,
      params.companyId,
      ApiKeyCreatedAt.now(),
    );
  }

  public static fromPrimitive(params: {
    id: string;
    domain: string;
    apiKey: string;
    publicKey: string;
    privateKey: string;
    kid: string;
    companyId: string;
    createdAt: Date;
  }): ApiKey {
    return new ApiKey(
      ApiKeyId.create(params.id),
      ApiKeyValue.create(params.apiKey),
      ApiKeyKid.create(params.kid),
      ApiKeyDomain.create(params.domain),
      ApiKeyPublicKey.create(params.publicKey),
      ApiKeyPrivateKey.create(params.privateKey),
      ApiKeyCompanyId.create(params.companyId),
      ApiKeyCreatedAt.create(params.createdAt),
    );
  }

  public toPrimitive() {
    return {
      id: this.id.getValue(),
      apiKey: this.apiKey.getValue(),
      kid: this.kid.getValue(),
      domain: this.domain.getValue(),
      publicKey: this.publicKey.getValue(),
      privateKey: this.privateKey.getValue(),
      companyId: this.companyId.getValue(),
      createdAt: this.createdAt.getValue(),
    };
  }
}
