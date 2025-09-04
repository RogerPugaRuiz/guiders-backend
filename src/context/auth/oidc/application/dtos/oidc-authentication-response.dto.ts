import { ApiProperty } from '@nestjs/swagger';

export class OidcAuthenticationResponseDto {
  @ApiProperty({
    description: 'Token de acceso JWT generado',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de renovación para obtener nuevos tokens de acceso',
    example: 'refresh_token_example_123',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({
    description: 'Información del usuario autenticado',
  })
  user: {
    id: string;
    email?: string;
    name?: string;
    roles: string[];
    companyId?: string;
  };

  @ApiProperty({
    description: 'Proveedor OIDC utilizado para la autenticación',
    example: 'google',
  })
  provider: string;
}