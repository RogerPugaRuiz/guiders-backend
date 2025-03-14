import { Inject, Injectable } from '@nestjs/common';
import { ValidateDomainApiKey } from '../../application/services/validate-domain-api-key';
import { VisitorAccountApiKey } from '../../domain/models/visitor-account-api-key';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from 'src/context/pixel/api-key/domain/repository/api-key.repository';

@Injectable()
export class ValidateDomainApiKeyAdapter implements ValidateDomainApiKey {
  constructor(
    @Inject(API_KEY_REPOSITORY) private readonly repository: ApiKeyRepository,
  ) {}

  async validate(params: {
    apiKey: VisitorAccountApiKey;
    domain: string;
  }): Promise<boolean> {
    const apiKey = await this.repository.getApiKeyByApiKey(params.apiKey);
    if (!apiKey) {
      return false;
    }
    return apiKey.domain.getValue() === params.domain;
  }
}
