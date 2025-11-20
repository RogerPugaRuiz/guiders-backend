import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de respuesta para la página actual del visitante
 */
export class GetVisitorCurrentPageResponseDto {
  @ApiProperty({
    description: 'URL de la página actual del visitante',
    example: 'https://example.com/products/123',
    nullable: true,
  })
  currentUrl: string | null;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-19T19:30:00.000Z',
  })
  updatedAt: Date;
}
