import { IsString, IsNotEmpty, IsUrl, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOidcProviderDto {
  @ApiProperty({
    description: 'Nombre único del proveedor OIDC',
    example: 'google',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Client ID proporcionado por el proveedor OIDC',
    example: 'your-client-id.apps.googleusercontent.com',
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({
    description: 'Client Secret proporcionado por el proveedor OIDC',
    example: 'your-client-secret',
  })
  @IsString()
  @IsNotEmpty()
  clientSecret: string;

  @ApiProperty({
    description: 'URL del issuer del proveedor OIDC',
    example: 'https://accounts.google.com',
  })
  @IsUrl()
  @IsNotEmpty()
  issuerUrl: string;

  @ApiProperty({
    description: 'Scopes solicitados durante la autenticación',
    example: ['openid', 'profile', 'email'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  scopes: string[];
}
