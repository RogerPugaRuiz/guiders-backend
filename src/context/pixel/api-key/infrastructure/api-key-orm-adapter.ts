import { Injectable } from '@nestjs/common';
import { ApiKeyRepository } from '../domain/repository/api-key.repository';
import { ApiKey } from '../domain/model/api-key';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKeyEntity } from './api-key.entity';
import { ApiKeyMapper } from './api-key.mapper';
import { Repository } from 'typeorm';
import { ApiKeyDomain } from '../domain/model/api-key-domain';
import { ApiKeyValue } from '../domain/model/api-key-value';

@Injectable()
export class ApiKeyOrmAdapter implements ApiKeyRepository {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    private readonly apiKeyMapper: ApiKeyMapper,
  ) {}

  async save(apiKey: ApiKey): Promise<void> {
    const apiKeyEntity = this.apiKeyMapper.toEntity(apiKey);
    await this.apiKeyRepository.save(apiKeyEntity);
  }

  async getApiKeyByDomain(domain: ApiKeyDomain): Promise<ApiKey | null> {
    const apiKeyEntity = await this.apiKeyRepository.findOne({
      where: { domain: domain.getValue() },
    });
    if (!apiKeyEntity) {
      return null;
    }
    return this.apiKeyMapper.toDomain(apiKeyEntity);
  }

  async getApiKeyByApiKey(apiKey: ApiKeyValue): Promise<ApiKey | null> {
    const apiKeyEntity = await this.apiKeyRepository.findOne({
      where: { apiKey: apiKey.getValue() },
    });
    if (!apiKeyEntity) {
      return null;
    }
    return this.apiKeyMapper.toDomain(apiKeyEntity);
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    const apiKeyEntities = await this.apiKeyRepository.find();
    return apiKeyEntities.map((apiKeyEntity) =>
      this.apiKeyMapper.toDomain(apiKeyEntity),
    );
  }
}
