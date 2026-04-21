import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO que representa una clave pública en formato JWK (RFC 7517).
 * Cada clave forma parte del conjunto JWKS expuesto por el servidor
 * para que clientes puedan verificar firmas de tokens JWT.
 */
export class JwkDto {
  @ApiProperty({
    description: 'Tipo de clave (Key Type). RSA para claves RSA.',
    example: 'RSA',
  })
  kty!: string;

  @ApiProperty({
    description: 'Identificador único de la clave (Key ID).',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  kid!: string;

  @ApiProperty({
    description: 'Uso previsto de la clave. "sig" indica firma.',
    example: 'sig',
  })
  use!: string;

  @ApiProperty({
    description: 'Algoritmo de firma asociado a la clave.',
    example: 'RS256',
  })
  alg!: string;

  @ApiProperty({
    description: 'Módulo RSA codificado en Base64URL.',
    example: 'sXch...DQ',
  })
  n!: string;

  @ApiProperty({
    description: 'Exponente público RSA codificado en Base64URL.',
    example: 'AQAB',
  })
  e!: string;
}

/**
 * DTO de respuesta del endpoint JWKS.
 * Estructura conforme al estándar RFC 7517 (JSON Web Key Set).
 */
export class JwksResponseDto {
  @ApiProperty({
    description:
      'Lista de claves públicas disponibles para verificación de firmas JWT.',
    type: [JwkDto],
  })
  keys!: JwkDto[];
}
