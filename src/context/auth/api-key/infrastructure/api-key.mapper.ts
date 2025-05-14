import { Injectable } from '@nestjs/common';
import { ApiKey } from '../domain/model/api-key';
import { ApiKeyEntity } from './api-key.entity';

@Injectable()
export class ApiKeyMapper {
  toEntity(apiKey: ApiKey): ApiKeyEntity {
    const apiKeyEntity = new ApiKeyEntity();
    apiKeyEntity.id = apiKey.id.getValue();
    apiKeyEntity.apiKey = apiKey.apiKey.getValue();
    apiKeyEntity.kid = apiKey.kid.getValue();
    apiKeyEntity.domain = apiKey.domain.getValue();
    apiKeyEntity.publicKey = apiKey.publicKey.getValue();
    apiKeyEntity.privateKey = apiKey.privateKey.getValue();
    apiKeyEntity.companyId = apiKey.companyId.getValue(); // Mapeo seguro de companyId
    apiKeyEntity.createdAt = apiKey.createdAt.getValue();
    return apiKeyEntity;
  }

  toDomain(apiKeyEntity: ApiKeyEntity): ApiKey {
    return ApiKey.fromPrimitive({
      id: apiKeyEntity.id,
      apiKey: apiKeyEntity.apiKey,
      kid: apiKeyEntity.kid,
      domain: apiKeyEntity.domain,
      publicKey: apiKeyEntity.publicKey,
      privateKey: apiKeyEntity.privateKey,
      companyId: apiKeyEntity.companyId, // Mapeo seguro de companyId
      createdAt: apiKeyEntity.createdAt,
    });
  }
}
