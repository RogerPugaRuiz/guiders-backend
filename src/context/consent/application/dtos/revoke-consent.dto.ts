import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para revocar un consentimiento
 * RGPD Art. 7.3: Derecho a retirar el consentimiento
 */
export class RevokeConsentDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  @IsNotEmpty()
  visitorId: string;

  @ApiProperty({
    description: 'Tipo de consentimiento a revocar',
    example: 'privacy_policy',
    enum: ['privacy_policy', 'marketing', 'analytics'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['privacy_policy', 'marketing', 'analytics'])
  consentType: string;

  @ApiProperty({
    description: 'Razón de la revocación (opcional)',
    example: 'Usuario solicitó eliminación de datos',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
