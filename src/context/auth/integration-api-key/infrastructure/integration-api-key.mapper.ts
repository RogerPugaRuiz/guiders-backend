import { Injectable } from '@nestjs/common';
import { IntegrationApiKey } from '../domain/model/integration-api-key.aggregate';
import { IntegrationApiKeyEntity } from './integration-api-key.entity';

@Injectable()
export class IntegrationApiKeyMapper {
  toEntity(key: IntegrationApiKey): IntegrationApiKeyEntity {
    const entity = new IntegrationApiKeyEntity();
    entity.id = key.id.getValue();
    entity.companyId = key.companyId.getValue();
    entity.name = key.name.getValue();
    entity.tokenHash = key.tokenHash.getValue();
    entity.tokenPrefix = key.tokenPrefix;
    entity.environment = key.environment.getValue();
    entity.status = key.status.getValue();
    entity.createdAt = key.createdAt;
    entity.lastUsedAt = key.lastUsedAt;
    entity.revokedAt = key.revokedAt;
    return entity;
  }

  toDomain(entity: IntegrationApiKeyEntity): IntegrationApiKey {
    return IntegrationApiKey.fromPrimitives({
      id: entity.id,
      companyId: entity.companyId,
      name: entity.name,
      tokenHash: entity.tokenHash,
      tokenPrefix: entity.tokenPrefix,
      environment: entity.environment,
      status: entity.status,
      createdAt: entity.createdAt,
      lastUsedAt: entity.lastUsedAt,
      revokedAt: entity.revokedAt,
    });
  }
}
