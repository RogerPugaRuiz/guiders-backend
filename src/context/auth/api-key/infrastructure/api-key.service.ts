import { Injectable } from '@nestjs/common';
import { CreateApiKeyForDomainUseCase } from '../application/usecase/create-api-key-for-domain.usecase';
import { GetApiKeysByCompanyIdUseCase } from '../application/usecase/get-api-keys-by-company-id.usecase';
import { ApiKeyCompanyId } from '../domain/model/api-key-company-id';
import { ApiKeyDomain } from '../domain/model/api-key-domain';

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
    const domainVO = ApiKeyDomain.create(domain);
    const companyIdVO = ApiKeyCompanyId.create(companyId);
    return await this.createApiKeyForDomainUseCase.execute(
      domainVO,
      companyIdVO,
    );
  }

  async listCompanyApiKeys(companyId: string) {
    const companyIdVO = ApiKeyCompanyId.create(companyId);
    return await this.getApiKeysByCompanyIdUseCase.execute(companyIdVO);
  }
}
