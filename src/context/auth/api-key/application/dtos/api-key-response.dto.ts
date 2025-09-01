import { ApiKey } from '../../domain/model/api-key';

export class ApiKeyResponseDto {
  domain!: string;
  apiKey!: string;
  kid!: string;
  publicKey!: string;
  createdAt?: Date; // Opcional: algunos listados no lo necesitaban originalmente
}

export class ApiKeyResponseDtoMapper {
  static fromDomain(
    apiKey: ApiKey,
    options?: { includeCreatedAt?: boolean },
  ): ApiKeyResponseDto {
    const { includeCreatedAt = false } = options || {};
    const dto = new ApiKeyResponseDto();
    dto.domain = apiKey.domain.getValue();
    dto.apiKey = apiKey.apiKey.getValue();
    dto.kid = apiKey.kid.getValue();
    dto.publicKey = apiKey.publicKey.getValue();
    if (includeCreatedAt) {
      dto.createdAt = apiKey.createdAt.getValue();
    }
    return dto;
  }

  static fromDomainList(
    apiKeys: ApiKey[],
    options?: { includeCreatedAt?: boolean },
  ): ApiKeyResponseDto[] {
    return apiKeys.map((k) => this.fromDomain(k, options));
  }
}
