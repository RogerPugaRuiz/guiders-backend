import { Inject, Injectable } from '@nestjs/common';
import {
  INTEGRATION_API_KEY_REPOSITORY,
  IntegrationApiKeyRepository,
} from '../../domain/repository/integration-api-key.repository';
import { IntegrationApiKeyCompanyId } from '../../domain/model/integration-api-key-company-id';
import { ListIntegrationApiKeysQuery } from './list-integration-api-keys.query';

export interface IntegrationApiKeyListItem {
  id: string;
  name: string;
  tokenPrefix: string;
  environment: string;
  status: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

@Injectable()
export class ListIntegrationApiKeysQueryHandler {
  constructor(
    @Inject(INTEGRATION_API_KEY_REPOSITORY)
    private readonly repository: IntegrationApiKeyRepository,
  ) {}

  async execute(query: ListIntegrationApiKeysQuery): Promise<IntegrationApiKeyListItem[]> {
    const keys = await this.repository.findByCompanyId(
      IntegrationApiKeyCompanyId.create(query.companyId),
    );

    return keys.map((key) => ({
      id: key.id.getValue(),
      name: key.name.getValue(),
      tokenPrefix: key.tokenPrefix,
      environment: key.environment.getValue(),
      status: key.status.getValue(),
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
    }));
  }
}
