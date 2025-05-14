import { Injectable } from '@nestjs/common';
import { CreateApiKeyForDomainUseCase } from '../application/usecase/create-api-key-for-domain.usecase';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly createApiKeyForDomainUseCase: CreateApiKeyForDomainUseCase,
  ) {}
  async createApiKeyForDomain(
    domain: string,
    companyId: string,
  ): Promise<{ apiKey: string }> {
    return await this.createApiKeyForDomainUseCase.execute(domain, companyId);
  }
}
