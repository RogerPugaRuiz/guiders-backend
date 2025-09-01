import { Injectable } from '@nestjs/common';
import { CreateApiKeyForDomainUseCase } from '../application/usecase/create-api-key-for-domain.usecase';
import { GetApiKeysByCompanyIdUseCase } from '../application/usecase/get-api-keys-by-company-id.usecase';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly createApiKeyForDomainUseCase: CreateApiKeyForDomainUseCase,
    private readonly getApiKeysByCompanyIdUseCase: GetApiKeysByCompanyIdUseCase,
  ) {}
  async createApiKeyForDomain(
    domain: string,
    companyId: string,
  ): Promise<{ apiKey: string }> {
    return await this.createApiKeyForDomainUseCase.execute(domain, companyId);
  }

  async listCompanyApiKeys(companyId: string) {
    return await this.getApiKeysByCompanyIdUseCase.execute(companyId);
  }
}
