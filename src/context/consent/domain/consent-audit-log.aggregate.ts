import { AggregateRoot } from '@nestjs/cqrs';
import { AuditLogId } from './value-objects/audit-log-id';
import { AuditActionType } from './value-objects/audit-action-type';
import { ConsentId } from './value-objects/consent-id';
import { VisitorId } from '../../visitors-v2/domain/value-objects/visitor-id';
import { ConsentType } from './value-objects/consent-type';

/**
 * Primitivos para la serialización del agregado ConsentAuditLog
 */
export interface ConsentAuditLogPrimitives {
  id: string;
  consentId: string;
  visitorId: string;
  actionType: string;
  consentType: string;
  consentVersion?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Propiedades para crear un ConsentAuditLog
 */
export interface ConsentAuditLogProperties {
  id: AuditLogId;
  consentId: ConsentId;
  visitorId: VisitorId;
  actionType: AuditActionType;
  consentType: ConsentType;
  consentVersion: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}

/**
 * Agregado ConsentAuditLog siguiendo DDD
 * Representa un registro de auditoría para acciones sobre consentimientos
 *
 * Requisitos GDPR:
 * - Art. 5.2: Responsabilidad proactiva - demostrar cumplimiento
 * - Art. 30: Registro de las actividades de tratamiento
 * - Art. 7.1: Demostrar que el interesado consintió
 *
 * Este agregado es inmutable (write-only) para garantizar integridad del historial
 */
export class ConsentAuditLog extends AggregateRoot {
  private constructor(
    private readonly _id: AuditLogId,
    private readonly _consentId: ConsentId,
    private readonly _visitorId: VisitorId,
    private readonly _actionType: AuditActionType,
    private readonly _consentType: ConsentType,
    private readonly _consentVersion: string | null,
    private readonly _ipAddress: string | null,
    private readonly _userAgent: string | null,
    private readonly _reason: string | null,
    private readonly _metadata: Record<string, unknown> | null,
    private readonly _timestamp: Date,
  ) {
    super();
  }

  /**
   * Método de fábrica para crear un registro de auditoría
   * Los audit logs son inmutables y solo se crean, nunca se modifican
   */
  static create(params: {
    consentId: string;
    visitorId: string;
    actionType: AuditActionType;
    consentType: string;
    consentVersion?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): ConsentAuditLog {
    const auditLogId = AuditLogId.random();
    const consentId = new ConsentId(params.consentId);
    const visitorId = VisitorId.create(params.visitorId);
    const consentType = new ConsentType(params.consentType);
    const timestamp = new Date();

    return new ConsentAuditLog(
      auditLogId,
      consentId,
      visitorId,
      params.actionType,
      consentType,
      params.consentVersion ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      params.reason ?? null,
      params.metadata ?? null,
      timestamp,
    );
  }

  /**
   * Método de fábrica para reconstruir desde primitivos
   */
  static fromPrimitives(
    primitives: ConsentAuditLogPrimitives,
  ): ConsentAuditLog {
    return new ConsentAuditLog(
      new AuditLogId(primitives.id),
      new ConsentId(primitives.consentId),
      VisitorId.create(primitives.visitorId),
      new AuditActionType(primitives.actionType),
      new ConsentType(primitives.consentType),
      primitives.consentVersion || null,
      primitives.ipAddress || null,
      primitives.userAgent || null,
      primitives.reason || null,
      primitives.metadata || null,
      new Date(primitives.timestamp),
    );
  }

  /**
   * Serializa el agregado a primitivos
   */
  toPrimitives(): ConsentAuditLogPrimitives {
    return {
      id: this._id.value,
      consentId: this._consentId.value,
      visitorId: this._visitorId.getValue(),
      actionType: this._actionType.getValue(),
      consentType: this._consentType.value,
      consentVersion: this._consentVersion || undefined,
      ipAddress: this._ipAddress || undefined,
      userAgent: this._userAgent || undefined,
      reason: this._reason || undefined,
      metadata: this._metadata || undefined,
      timestamp: this._timestamp.toISOString(),
    };
  }

  // Getters de solo lectura
  get id(): AuditLogId {
    return this._id;
  }

  get consentId(): ConsentId {
    return this._consentId;
  }

  get visitorId(): VisitorId {
    return this._visitorId;
  }

  get actionType(): AuditActionType {
    return this._actionType;
  }

  get consentType(): ConsentType {
    return this._consentType;
  }

  get consentVersion(): string | null {
    return this._consentVersion;
  }

  get ipAddress(): string | null {
    return this._ipAddress;
  }

  get userAgent(): string | null {
    return this._userAgent;
  }

  get reason(): string | null {
    return this._reason;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  get timestamp(): Date {
    return this._timestamp;
  }
}
