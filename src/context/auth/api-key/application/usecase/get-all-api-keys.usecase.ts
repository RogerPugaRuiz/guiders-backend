import { Inject, Injectable } from '@nestjs/common';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../domain/repository/api-key.repository';
import {
  ApiKeyResponseDto,
  ApiKeyResponseDtoMapper,
} from '../dtos/api-key-response.dto';

@Injectable()
export class GetAllApiKeysUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

  async execute(): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.apiKeyRepository.getAllApiKeys();
    return ApiKeyResponseDtoMapper.fromDomainList(apiKeys, {
      includeCreatedAt: true,
    });
  }
}
