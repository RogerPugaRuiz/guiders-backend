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

  async execute(companyId: string): Promise<ApiKeyResponseDto[]> {
    const companyIdVO = ApiKeyCompanyId.create(companyId);
    const apiKeys =
      await this.apiKeyRepository.getApiKeysByCompanyId(companyIdVO);
    return ApiKeyResponseDtoMapper.fromDomainList(apiKeys, {
      includeCreatedAt: true,
    });
  }
}
