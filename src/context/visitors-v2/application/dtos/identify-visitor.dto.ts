import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { getCurrentConsentVersion } from '../../../consent/domain/config/consent-version.config';

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

  @ApiProperty({
    description:
      'Indica si el visitante ha aceptado la política de privacidad (RGPD Art. 7.1). ' +
      'OBLIGATORIO: debe ser true para poder procesar datos personales.',
    example: true,
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  hasAcceptedPrivacyPolicy: boolean;

  @ApiProperty({
    description:
      'Versión de la política de privacidad aceptada (ej: v1.4.0, v2.0). ' +
      'Permite trackear qué versión aceptó el usuario según RGPD Art. 7.1. ' +
      'Si no se especifica, usa la versión actual configurada en el sistema.',
    example: getCurrentConsentVersion(),
    required: false,
    default: getCurrentConsentVersion(),
  })
  @IsString()
  @IsOptional()
  consentVersion?: string;
}
