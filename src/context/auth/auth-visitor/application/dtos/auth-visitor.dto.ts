import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// DTO para petición de obtención de tokens (login por client id + dominio por cabeceras)
export class TokenRequestDto {
  @ApiProperty({
    example: 12345,
    description:
      'Identificador numérico del cliente (session / visitor id) generado por el script del pixel',
  })
  @IsInt()
  @Type(() => Number)
  client: number;
}

// DTO para registro de visitante
export class RegisterVisitorRequestDto {
  @ApiProperty({
    example: 'gdr_live_abc123',
    description: 'API Key pública asociada a la compañía (dominio autorizado)',
  })
  @IsString()
  apiKey: string;

  @ApiProperty({
    example: 12345,
    description:
      'Identificador numérico del cliente (session / visitor id) generado por el script del pixel',
  })
  @IsInt()
  @Type(() => Number)
  client: number;

  @ApiProperty({
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)...',
    description: 'User-Agent capturado en el navegador del visitante',
  })
  @IsString()
  userAgent: string;
}

// DTO para refresh de token
export class RefreshTokenRequestDto {
  @ApiProperty({
    name: 'refresh_token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token previamente emitido',
  })
  @IsString()
  refresh_token: string;
}

// Respuesta estándar de emisión de tokens
export class TokensResponseDto {
  @ApiProperty({ description: 'JWT de acceso (corto plazo)' })
  access_token: string;
  @ApiProperty({ description: 'Refresh token (largo plazo)' })
  refresh_token: string;
}

// Respuesta de refresh
export class AccessTokenResponseDto {
  @ApiProperty({ description: 'Nuevo JWT de acceso' })
  access_token: string;
}
