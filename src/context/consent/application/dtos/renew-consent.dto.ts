import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsISO8601 } from 'class-validator';

/**
 * DTO para renovar un consentimiento
 * GDPR Art. 7.1: Renovación del consentimiento mantiene trazabilidad
 */
export class RenewConsentDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  @IsNotEmpty()
  visitorId: string;

  @ApiProperty({
    description: 'Tipo de consentimiento a renovar',
    example: 'privacy_policy',
    enum: ['privacy_policy', 'marketing', 'analytics'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['privacy_policy', 'marketing', 'analytics'])
  consentType: string;

  @ApiProperty({
    description: 'Nueva fecha de expiración en formato ISO 8601',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsString()
  @IsNotEmpty()
  @IsISO8601()
  newExpiresAt: string;
}
