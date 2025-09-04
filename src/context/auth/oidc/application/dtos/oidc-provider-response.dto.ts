import { ApiProperty } from '@nestjs/swagger';

export class OidcProviderResponseDto {
  @ApiProperty({
    description: 'ID único del proveedor OIDC',
    example: 'google-provider-123',
  })
  id: string;

  @ApiProperty({
    description: 'Nombre del proveedor OIDC',
    example: 'google',
  })
  name: string;

  @ApiProperty({
    description: 'Client ID del proveedor OIDC',
    example: 'your-client-id.apps.googleusercontent.com',
  })
  clientId: string;

  @ApiProperty({
    description: 'URL del issuer del proveedor OIDC',
    example: 'https://accounts.google.com',
  })
  issuerUrl: string;

  @ApiProperty({
    description: 'Scopes configurados',
    example: ['openid', 'profile', 'email'],
    type: [String],
  })
  scopes: string[];

  @ApiProperty({
    description: 'Estado del proveedor (habilitado/deshabilitado)',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
