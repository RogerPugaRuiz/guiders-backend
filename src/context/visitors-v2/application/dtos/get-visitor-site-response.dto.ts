import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para el siteId del visitante
 */
export class GetVisitorSiteResponseDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: '9598b495-205c-46af-9c06-d5dffb28ee21',
  })
  visitorId: string;

  @ApiProperty({
    description: 'ID del sitio al que pertenece el visitante',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  siteId: string;

  @ApiProperty({
    description: 'ID del tenant (empresa) al que pertenece el visitante',
    example: 'e7f55515-a427-46ed-932e-662fe7effc40',
  })
  tenantId: string;
}
