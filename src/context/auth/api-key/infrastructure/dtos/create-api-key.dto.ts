import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO de petición para crear (o reutilizar) una API Key asociada a un dominio
 * y a una compañía. Si el dominio ya cuenta con una API Key existente,
 * el servicio la reutiliza en lugar de generar una nueva.
 */
export class CreateApiKeyRequestDto {
  @ApiProperty({
    description: 'Dominio para el cual se crea o reutiliza la API Key.',
    example: 'example.com',
  })
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @ApiProperty({
    description: 'Identificador único (UUID) de la compañía propietaria.',
    example: 'b0a4c9f2-2f6a-4c44-9c3e-8f0a5d2a1e11',
    format: 'uuid',
  })
  @IsUUID()
  companyId!: string;
}

/**
 * DTO de respuesta al crear o reutilizar una API Key.
 */
export class CreateApiKeyResponseDto {
  @ApiProperty({
    description: 'API Key generada o reutilizada para el dominio indicado.',
    example: 'ak_live_abcdef0123456789...',
  })
  apiKey!: string;
}
