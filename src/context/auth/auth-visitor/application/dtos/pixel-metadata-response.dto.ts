import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para el endpoint GET /pixel/metadata
 * Retorna los identificadores internos necesarios para tracking
 */
export class PixelMetadataResponseDto {
  @ApiProperty({
    description: 'UUID del tenant (company)',
    example: 'a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d',
  })
  tenantId: string;

  @ApiProperty({
    description: 'UUID del sitio',
    example: 'b2c3d4e5-f6a7-4b2c-9d0e-1f2a3b4c5d6e',
  })
  siteId: string;

  @ApiProperty({
    description: 'Dominio del sitio',
    example: 'example.com',
  })
  domain: string;

  constructor(tenantId: string, siteId: string, domain: string) {
    this.tenantId = tenantId;
    this.siteId = siteId;
    this.domain = domain;
  }
}
