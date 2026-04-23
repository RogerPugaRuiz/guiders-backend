import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, MinLength, MaxLength } from 'class-validator';

export class CreateIntegrationApiKeyDto {
  @ApiProperty({
    example: 'Mi integración CRM',
    description: 'Nombre descriptivo para esta API Key',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'live',
    enum: ['live', 'test'],
    description: 'Entorno de la key',
  })
  @IsIn(['live', 'test'])
  environment: 'live' | 'test';
}

export class IntegrationApiKeyCreatedResponseDto {
  @ApiProperty({ description: 'ID de la API Key' })
  id: string;

  @ApiProperty({ description: 'Nombre descriptivo' })
  name: string;

  @ApiProperty({
    description:
      'Token completo. Solo se muestra una vez. Guárdalo de forma segura.',
    example: 'gdr_live_a1b2c3d4e5f6...',
  })
  token: string;

  @ApiProperty({ description: 'Prefijo del token para identificación en UI' })
  tokenPrefix: string;

  @ApiProperty({ enum: ['live', 'test'] })
  environment: string;

  @ApiProperty()
  createdAt: Date;
}

export class IntegrationApiKeyListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: 'Prefijo del token para identificación',
    example: 'gdr_live_a1b2...',
  })
  tokenPrefix: string;

  @ApiProperty({ enum: ['live', 'test'] })
  environment: string;

  @ApiProperty({ enum: ['active', 'revoked'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty({ nullable: true })
  revokedAt: Date | null;
}
