import { Inject, Injectable, Logger } from '@nestjs/common';
import { ValidateDomainApiKey } from '../../application/services/validate-domain-api-key';
import { VisitorAccountApiKey } from '../../domain/models/visitor-account-api-key';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from 'src/context/auth/api-key/domain/repository/api-key.repository';

@Injectable()
export class ValidateDomainApiKeyAdapter implements ValidateDomainApiKey {
  private readonly logger = new Logger(ValidateDomainApiKeyAdapter.name);
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
    this.logger.log('apiKey.domain' + apiKey.domain.getValue());
    this.logger.log('params.domain' + params.domain);
    return apiKey.domain.getValue() === params.domain;
  }
}
