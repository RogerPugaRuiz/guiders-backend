import { ApiProperty } from '@nestjs/swagger';

// DTO de respuesta para la resolución de sitio por host
export class ResolveSiteByHostResponseDto {
  @ApiProperty({
    description: 'Identificador del tenant (empresa) al que pertenece el sitio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  public readonly tenantId: string;

  @ApiProperty({
    description: 'Identificador único del sitio resuelto',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  public readonly siteId: string;

  constructor(tenantId: string, siteId: string) {
    this.tenantId = tenantId;
    this.siteId = siteId;
  }

  // Método estático para crear desde primitivos de Company y Site
  public static fromPrimitives(
    companyId: string,
    siteId: string,
  ): ResolveSiteByHostResponseDto {
    return new ResolveSiteByHostResponseDto(companyId, siteId);
  }
}
