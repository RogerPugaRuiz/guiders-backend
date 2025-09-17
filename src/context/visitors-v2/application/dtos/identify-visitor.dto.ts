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
    description: 'Dominio donde está el visitante',
    example: 'landing.mytech.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({
    description: 'API Key para autenticación',
    example: 'ak_live_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({
    description: 'URL de la página actual (opcional)',
    example: 'https://landing.mytech.com/home',
    required: false,
  })
  @IsString()
  @IsOptional()
  currentUrl?: string;
}
