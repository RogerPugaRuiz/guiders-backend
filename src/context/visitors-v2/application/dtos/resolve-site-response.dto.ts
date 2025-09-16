import { ApiProperty } from '@nestjs/swagger';

export class ResolveSiteResponseDto {
  @ApiProperty({
    description: 'ID único del tenant/inquilino',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  readonly tenantId: string;

  @ApiProperty({
    description: 'ID único del sitio',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  readonly siteId: string;

  @ApiProperty({
    description: 'Nombre del sitio resuelto',
    example: 'Landing Page - MyTech',
    required: false,
  })
  readonly siteName?: string;

  @ApiProperty({
    description: 'Nombre del tenant resuelto',
    example: 'MyTech Company',
    required: false,
  })
  readonly tenantName?: string;

  constructor(
    tenantId: string,
    siteId: string,
    siteName?: string,
    tenantName?: string,
  ) {
    this.tenantId = tenantId;
    this.siteId = siteId;
    this.siteName = siteName;
    this.tenantName = tenantName;
  }
}
