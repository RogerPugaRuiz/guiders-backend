import { ApiProperty } from '@nestjs/swagger';
import { ConsentAuditLogPrimitives } from '../../domain/consent-audit-log.aggregate';

/**
 * DTO de respuesta para un registro de auditoría individual
 */
export class AuditLogResponseDto {
  @ApiProperty({
    description: 'ID único del registro de auditoría',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID del consentimiento relacionado',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  consentId: string;

  @ApiProperty({
    description: 'ID del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  visitorId: string;

  @ApiProperty({
    description: 'Tipo de acción realizada',
    example: 'consent_granted',
    enum: ['consent_granted', 'consent_revoked', 'consent_expired'],
  })
  actionType: string;

  @ApiProperty({
    description: 'Tipo de consentimiento',
    example: 'privacy_policy',
    enum: ['privacy_policy', 'marketing', 'analytics'],
  })
  consentType: string;

  @ApiProperty({
    description: 'Versión del consentimiento',
    example: 'v1.0.0',
    required: false,
  })
  consentVersion?: string;

  @ApiProperty({
    description: 'Dirección IP desde donde se realizó la acción',
    example: '192.168.1.1',
    required: false,
  })
  ipAddress?: string;

  @ApiProperty({
    description: 'User Agent del navegador',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Razón de la acción (opcional, para revocaciones)',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: 'Metadatos adicionales',
    required: false,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp de cuando ocurrió la acción',
    example: '2025-10-10T10:30:00.000Z',
  })
  timestamp: string;

  constructor(primitives: ConsentAuditLogPrimitives) {
    this.id = primitives.id;
    this.consentId = primitives.consentId;
    this.visitorId = primitives.visitorId;
    this.actionType = primitives.actionType;
    this.consentType = primitives.consentType;
    this.consentVersion = primitives.consentVersion;
    this.ipAddress = primitives.ipAddress;
    this.userAgent = primitives.userAgent;
    this.reason = primitives.reason;
    this.metadata = primitives.metadata;
    this.timestamp = primitives.timestamp;
  }
}

/**
 * DTO de respuesta para una lista de registros de auditoría
 */
export class AuditLogListResponseDto {
  @ApiProperty({
    description: 'Lista de registros de auditoría',
    type: [AuditLogResponseDto],
  })
  auditLogs: AuditLogResponseDto[];

  @ApiProperty({
    description: 'Total de registros',
    example: 42,
  })
  total: number;

  constructor(auditLogs: ConsentAuditLogPrimitives[]) {
    this.auditLogs = auditLogs.map((log) => new AuditLogResponseDto(log));
    this.total = auditLogs.length;
  }
}
