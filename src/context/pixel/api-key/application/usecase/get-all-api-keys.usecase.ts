import { Inject, Injectable } from '@nestjs/common';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../domain/repository/api-key.repository';

@Injectable()
export class GetAllApiKeysUseCase {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

  async execute(): Promise<
    Array<{ domain: string; apiKey: string; kid: string; publicKey: string }>
  > {
    const apiKeys = await this.apiKeyRepository.getAllApiKeys();
    return apiKeys.map((apiKey) => ({
      domain: apiKey.domain.getValue(),
      apiKey: apiKey.apiKey.getValue(),
      kid: apiKey.kid.getValue(),
      publicKey: apiKey.publicKey.getValue(),
    }));
  }
}
