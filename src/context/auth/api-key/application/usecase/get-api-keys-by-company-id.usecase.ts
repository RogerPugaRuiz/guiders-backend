import { Inject, Injectable } from '@nestjs/common';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../domain/repository/api-key.repository';
import { ApiKeyCompanyId } from '../../domain/model/api-key-company-id';
import {
  ApiKeyResponseDto,
  ApiKeyResponseDtoMapper,
} from '../dtos/api-key-response.dto';

@Injectable()
export class GetApiKeysByCompanyIdUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

  // Ahora recibe directamente el Value Object para mantener consistencia en capa aplicación
  async execute(companyId: ApiKeyCompanyId): Promise<ApiKeyResponseDto[]> {
    const apiKeys =
      await this.apiKeyRepository.getApiKeysByCompanyId(companyId);
    return ApiKeyResponseDtoMapper.fromDomainList(apiKeys, {
      includeCreatedAt: true,
    });
  }
}
