import { Inject, Injectable } from '@nestjs/common';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../domain/repository/api-key.repository';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';

@Injectable()
export class GetApiKeysByCompanyIdUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

  async execute(companyId: string): Promise<
    Array<{
      domain: string;
      apiKey: string;
      kid: string;
      publicKey: string;
      createdAt: Date;
    }>
  > {
    const companyIdVO = ApiKeyCompanyId.create(companyId);
    const apiKeys =
      await this.apiKeyRepository.getApiKeysByCompanyId(companyIdVO);
    return apiKeys.map((apiKey) => ({
      domain: apiKey.domain.getValue(),
      apiKey: apiKey.apiKey.getValue(),
      kid: apiKey.kid.getValue(),
      publicKey: apiKey.publicKey.getValue(),
      createdAt: apiKey.createdAt.getValue(),
    }));
  }
}
