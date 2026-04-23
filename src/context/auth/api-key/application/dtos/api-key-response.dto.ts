import { ApiProperty } from '@nestjs/swagger';
import { ApiKey } from '../../domain/model/api-key';

export class ApiKeyResponseDto {
  @ApiProperty({
    description: 'Dominio asociado a la API Key',
    example: 'example.com',
  })
  domain!: string;

  @ApiProperty({
    description: 'Valor de la API Key',
    example: '12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0',
  })
  apiKey!: string;

  @ApiProperty({
    description: 'Identificador único de la clave (Key ID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  kid!: string;

  @ApiProperty({
    description: 'Clave pública asociada para verificación de firmas',
    example: '-----BEGIN PUBLIC KEY-----\nMIIBIjAN...',
  })
  publicKey!: string;

  @ApiProperty({
    description: 'Fecha de creación de la API Key',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
    nullable: true,
  })
  createdAt?: Date;
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
