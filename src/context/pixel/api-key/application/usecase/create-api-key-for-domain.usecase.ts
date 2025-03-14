import { Inject, Injectable } from '@nestjs/common';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../domain/repository/api-key.repository';
import { ApiKey } from '../../domain/model/api-key';
import { ApiKeyDomain } from '../../domain/model/api-key-domain';
import { ApiKeyPublicKey } from '../../domain/model/api-key-public-key';
import { ApiKeyPrivateKey } from '../../domain/model/api-key-private-key';
import { ApiKeyValue } from '../../domain/model/api-key-value';
import { API_KEY_HASHER, ApiKeyHasher } from '../services/api-key-hasher';
import {
  API_KEY_ENCRYPT_PRIVATE_KEY,
  ApiKeyEncryptPrivateKey,
} from '../services/api-key-encrypt-private-key';
import {
  API_KEY_GENERATE_KEYS,
  ApiKeyGenerateKeys,
} from '../services/api-key-generate-keys';

@Injectable()
export class CreateApiKeyForDomainUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: ApiKeyRepository,
    @Inject(API_KEY_GENERATE_KEYS)
    private readonly keysGenerator: ApiKeyGenerateKeys,
    @Inject(API_KEY_ENCRYPT_PRIVATE_KEY)
    private readonly encryptService: ApiKeyEncryptPrivateKey,
    @Inject(API_KEY_HASHER)
    private readonly hashService: ApiKeyHasher,
  ) {}
  async execute(domain: string): Promise<{ apiKey: string }> {
    const domainValue = ApiKeyDomain.create(domain);
    const apiKeyValue = ApiKeyValue.create(await this.hashService.hash(domain));

    const foundApiKey =
      await this.apiKeyRepository.getApiKeyByDomain(domainValue);
    if (foundApiKey) {
      return { apiKey: foundApiKey.apiKey.getValue() };
    }
    const { publicKey, privateKey } = await this.keysGenerator.generate();

    const publicKeyValue = ApiKeyPublicKey.create(publicKey);
    const privateKeyValue = ApiKeyPrivateKey.create(privateKey);
    const kidValue = ApiKeyValue.create(await this.hashService.hash(publicKey));

    const newApiKey = ApiKey.create({
      domain: domainValue,
      publicKey: publicKeyValue,
      privateKey: privateKeyValue,
      apiKey: apiKeyValue,
      kid: kidValue,
    });

    await this.apiKeyRepository.save(newApiKey);
    return { apiKey: newApiKey.apiKey.getValue() };
  }
}
