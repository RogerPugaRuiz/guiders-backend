import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IdentifyVisitorDto {
  @ApiProperty({
    description: 'Huella digital única del visitante (browser fingerprint)',
    example: 'fp_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  fingerprint: string;

  @ApiProperty({
    description: 'ID del sitio donde está el visitante',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiProperty({
    description: 'ID del tenant/empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'URL de la página actual (opcional)',
    example: 'https://landing.mytech.com/home',
    required: false,
  })
  @IsString()
  @IsOptional()
  currentUrl?: string;
}
