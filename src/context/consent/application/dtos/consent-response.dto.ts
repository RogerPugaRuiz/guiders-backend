import { ApiProperty } from '@nestjs/swagger';
import { VisitorConsentPrimitives } from '../../domain/visitor-consent.aggregate';

/**
 * DTO de respuesta para un consentimiento
 */
export class ConsentResponseDto {
  @ApiProperty({
    description: 'ID único del consentimiento',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  visitorId: string;

  @ApiProperty({
    description: 'Tipo de consentimiento',
    example: 'privacy_policy',
    enum: ['privacy_policy', 'marketing', 'analytics'],
  })
  consentType: string;

  @ApiProperty({
    description: 'Estado del consentimiento',
    example: 'granted',
    enum: ['granted', 'revoked', 'expired'],
  })
  status: string;

  @ApiProperty({
    description: 'Versión de la política de privacidad',
    example: '1.0.0',
  })
  version: string;

  @ApiProperty({
    description: 'Fecha y hora en que se otorgó el consentimiento',
    example: '2025-01-10T10:30:00.000Z',
  })
  grantedAt: string;

  @ApiProperty({
    description: 'Fecha y hora en que se revocó el consentimiento (opcional)',
    example: '2025-01-15T14:20:00.000Z',
    required: false,
  })
  revokedAt?: string;

  @ApiProperty({
    description: 'Fecha y hora de expiración (opcional)',
    example: '2026-01-10T10:30:00.000Z',
    required: false,
  })
  expiresAt?: string;

  @ApiProperty({
    description: 'Dirección IP desde la que se otorgó el consentimiento',
    example: '192.168.1.1',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'User agent del navegador (opcional)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Metadatos adicionales (opcional)',
    example: { source: 'web', campaign: 'summer2025' },
    required: false,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2025-01-10T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-01-10T10:30:00.000Z',
  })
  updatedAt: string;

  constructor(primitives: VisitorConsentPrimitives) {
    this.id = primitives.id;
    this.visitorId = primitives.visitorId;
    this.consentType = primitives.consentType;
    this.status = primitives.status;
    this.version = primitives.version;
    this.grantedAt = primitives.grantedAt;
    this.revokedAt = primitives.revokedAt;
    this.expiresAt = primitives.expiresAt;
    this.ipAddress = primitives.ipAddress;
    this.userAgent = primitives.userAgent;
    this.metadata = primitives.metadata;
    this.createdAt = primitives.createdAt;
    this.updatedAt = primitives.updatedAt;
  }
}

/**
 * DTO de respuesta para el historial de consentimientos
 */
export class ConsentHistoryResponseDto {
  @ApiProperty({
    description: 'Lista de consentimientos del visitante',
    type: [ConsentResponseDto],
  })
  consents: ConsentResponseDto[];

  @ApiProperty({
    description: 'Total de consentimientos',
    example: 3,
  })
  total: number;

  constructor(consents: VisitorConsentPrimitives[]) {
    this.consents = consents.map((c) => new ConsentResponseDto(c));
    this.total = consents.length;
  }
}
