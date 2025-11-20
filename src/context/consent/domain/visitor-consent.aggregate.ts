import { AggregateRoot } from '@nestjs/cqrs';
import { ConsentId } from './value-objects/consent-id';
import { ConsentType } from './value-objects/consent-type';
import { ConsentStatus } from './value-objects/consent-status';
import { ConsentVersion } from './value-objects/consent-version';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';
import { ConsentGrantedEvent } from './events/consent-granted.event';
import { ConsentDeniedEvent } from './events/consent-denied.event';
import { ConsentRevokedEvent } from './events/consent-revoked.event';
import { ConsentExpiredEvent } from './events/consent-expired.event';
import { ConsentRenewedEvent } from './events/consent-renewed.event';

/**
 * Primitivos para la serialización del agregado VisitorConsent
 */
export interface VisitorConsentPrimitives {
  id: string;
  visitorId: string;
  consentType: string;
  status: string;
  version: string;
  grantedAt: string;
  revokedAt?: string;
  expiresAt?: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Propiedades para crear un VisitorConsent
 */
export interface VisitorConsentProperties {
  id: ConsentId;
  visitorId: VisitorId;
  consentType: ConsentType;
  status: ConsentStatus;
  version: ConsentVersion;
  grantedAt: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agregado VisitorConsent siguiendo DDD
 * Representa el registro de consentimiento de un visitante según RGPD Art. 7
 *
 * Requisitos RGPD:
 * - Art. 7.1: Capacidad de demostrar que el interesado consintió
 * - Art. 7.3: El interesado tendrá derecho a retirar su consentimiento
 * - Debe registrarse: fecha/hora, versión de política, IP, método de consentimiento
 */
export class VisitorConsent extends AggregateRoot {
  private constructor(
    private readonly _id: ConsentId,
    private readonly _visitorId: VisitorId,
    private readonly _consentType: ConsentType,
    private _status: ConsentStatus,
    private readonly _version: ConsentVersion,
    private readonly _grantedAt: Date,
    private _revokedAt: Date | null,
    private readonly _expiresAt: Date | null,
    private readonly _ipAddress: string,
    private readonly _userAgent: string | null,
    private readonly _metadata: Record<string, unknown> | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super();
  }

  /**
   * Método de fábrica para registrar un nuevo consentimiento (emite evento)
   */
  static grant(params: {
    visitorId: string;
    consentType: ConsentType;
    version: ConsentVersion;
    ipAddress: string;
    userAgent?: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): VisitorConsent {
    const now = new Date();
    const consentId = ConsentId.random();
    const visitorId = VisitorId.create(params.visitorId);
    const status = ConsentStatus.granted();
    const userAgent = params.userAgent ?? null;
    const expiresAt = params.expiresAt ?? null;
    const metadata = params.metadata ?? null;

    const consent = new VisitorConsent(
      consentId,
      visitorId,
      params.consentType,
      status,
      params.version,
      now,
      null,
      expiresAt,
      params.ipAddress,
      userAgent,
      metadata,
      now,
      now,
    );

    // Emitir evento de dominio
    const event = new ConsentGrantedEvent({
      consentId: consentId.value,
      visitorId: params.visitorId,
      consentType: params.consentType.value,
      version: params.version.value,
      grantedAt: now.toISOString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    consent.apply(event);

    return consent;
  }

  /**
   * Método de fábrica para registrar un rechazo de consentimiento (emite evento)
   * RGPD Art. 5.2: Responsabilidad proactiva - demostrar cumplimiento
   */
  static deny(params: {
    visitorId: string;
    consentType: ConsentType;
    version: ConsentVersion;
    ipAddress: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): VisitorConsent {
    const now = new Date();
    const consentId = ConsentId.random();
    const visitorId = VisitorId.create(params.visitorId);
    const status = ConsentStatus.denied();
    const userAgent = params.userAgent ?? null;
    const metadata = params.metadata ?? null;

    const consent = new VisitorConsent(
      consentId,
      visitorId,
      params.consentType,
      status,
      params.version,
      now, // deniedAt (usamos grantedAt para timestamp)
      null, // revokedAt
      null, // expiresAt (no expira un rechazo)
      params.ipAddress,
      userAgent,
      metadata,
      now,
      now,
    );

    // Emitir evento de dominio
    const event = new ConsentDeniedEvent({
      consentId: consentId.value,
      visitorId: params.visitorId,
      consentType: params.consentType.value,
      version: params.version.value,
      deniedAt: now.toISOString(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
    consent.apply(event);

    return consent;
  }

  /**
   * Método de fábrica para reconstruir desde primitivos (sin eventos)
   */
  static fromPrimitives(primitives: VisitorConsentPrimitives): VisitorConsent {
    return new VisitorConsent(
      new ConsentId(primitives.id),
      VisitorId.create(primitives.visitorId),
      new ConsentType(primitives.consentType),
      new ConsentStatus(primitives.status),
      ConsentVersion.fromString(primitives.version),
      new Date(primitives.grantedAt),
      primitives.revokedAt ? new Date(primitives.revokedAt) : null,
      primitives.expiresAt ? new Date(primitives.expiresAt) : null,
      primitives.ipAddress,
      primitives.userAgent || null,
      primitives.metadata || null,
      new Date(primitives.createdAt),
      new Date(primitives.updatedAt),
    );
  }

  /**
   * Revoca el consentimiento (emite evento)
   * RGPD Art. 7.3: Derecho a retirar el consentimiento
   */
  revoke(reason?: string): VisitorConsent {
    if (this._status.isRevoked()) {
      throw new Error('El consentimiento ya ha sido revocado');
    }

    const now = new Date();
    const revokedStatus = ConsentStatus.revoked();
    const revoked = new VisitorConsent(
      this._id,
      this._visitorId,
      this._consentType,
      revokedStatus,
      this._version,
      this._grantedAt,
      now,
      this._expiresAt,
      this._ipAddress,
      this._userAgent,
      this._metadata,
      this._createdAt,
      now,
    );

    // Emitir evento de dominio
    const event = new ConsentRevokedEvent({
      consentId: this._id.value,
      visitorId: this._visitorId.getValue(),
      consentType: this._consentType.value,
      revokedAt: now.toISOString(),
      reason,
    });
    revoked.apply(event);

    return revoked;
  }

  /**
   * Marca el consentimiento como expirado (emite evento)
   * Se utiliza cuando un consentimiento alcanza su fecha de expiración
   */
  expire(): VisitorConsent {
    if (this._status.isExpired()) {
      throw new Error('El consentimiento ya ha expirado');
    }

    if (!this._expiresAt) {
      throw new Error('El consentimiento no tiene fecha de expiración');
    }

    if (!this.isExpired()) {
      throw new Error(
        'El consentimiento aún no ha alcanzado su fecha de expiración',
      );
    }

    const now = new Date();
    const expiredStatus = ConsentStatus.expired();
    const expired = new VisitorConsent(
      this._id,
      this._visitorId,
      this._consentType,
      expiredStatus,
      this._version,
      this._grantedAt,
      this._revokedAt,
      this._expiresAt,
      this._ipAddress,
      this._userAgent,
      this._metadata,
      this._createdAt,
      now,
    );

    // Emitir evento de dominio
    const event = new ConsentExpiredEvent({
      consentId: this._id.value,
      visitorId: this._visitorId.getValue(),
      consentType: this._consentType.value,
      expiredAt: this._expiresAt.toISOString(),
    });
    expired.apply(event);

    return expired;
  }

  /**
   * Renueva el consentimiento extendiendo su fecha de expiración (emite evento)
   * Permite extender la validez de un consentimiento activo
   * GDPR Art. 7.1: Mantener registro actualizado del consentimiento
   */
  renew(newExpiresAt: Date): VisitorConsent {
    if (this._status.isRevoked()) {
      throw new Error(
        'No se puede renovar un consentimiento revocado. Debe otorgarse un nuevo consentimiento.',
      );
    }

    if (this._status.isExpired()) {
      throw new Error(
        'No se puede renovar un consentimiento expirado. Debe otorgarse un nuevo consentimiento.',
      );
    }

    if (!this._status.canProcessData()) {
      throw new Error(
        'Solo se pueden renovar consentimientos en estado granted',
      );
    }

    const now = new Date();

    // Validar que la nueva fecha de expiración sea futura
    if (newExpiresAt <= now) {
      throw new Error(
        'La nueva fecha de expiración debe ser posterior a la fecha actual',
      );
    }

    const renewed = new VisitorConsent(
      this._id,
      this._visitorId,
      this._consentType,
      this._status,
      this._version,
      this._grantedAt,
      this._revokedAt,
      newExpiresAt,
      this._ipAddress,
      this._userAgent,
      this._metadata,
      this._createdAt,
      now,
    );

    // Emitir evento de dominio
    const event = new ConsentRenewedEvent({
      consentId: this._id.value,
      visitorId: this._visitorId.getValue(),
      consentType: this._consentType.value,
      newExpiresAt: newExpiresAt.toISOString(),
      renewedAt: now.toISOString(),
      previousExpiresAt: this._expiresAt?.toISOString(),
    });
    renewed.apply(event);

    return renewed;
  }

  /**
   * Verifica si el consentimiento ha expirado
   */
  isExpired(): boolean {
    if (!this._expiresAt) {
      return false;
    }
    return new Date() > this._expiresAt;
  }

  /**
   * Verifica si el consentimiento está próximo a expirar
   * @param daysBeforeExpiration Número de días antes de la expiración
   */
  isExpiringSoon(daysBeforeExpiration: number = 30): boolean {
    if (!this._expiresAt) {
      return false;
    }

    const now = new Date();
    const expirationThreshold = new Date(this._expiresAt);
    expirationThreshold.setDate(
      expirationThreshold.getDate() - daysBeforeExpiration,
    );

    return now >= expirationThreshold && now < this._expiresAt;
  }

  /**
   * Verifica si el consentimiento está activo y puede ser usado
   */
  canProcessData(): boolean {
    return this._status.canProcessData() && !this.isExpired();
  }

  /**
   * Serializa el agregado a primitivos
   */
  toPrimitives(): VisitorConsentPrimitives {
    return {
      id: this._id.value,
      visitorId: this._visitorId.getValue(),
      consentType: this._consentType.value,
      status: this._status.value,
      version: this._version.value,
      grantedAt: this._grantedAt.toISOString(),
      revokedAt: this._revokedAt?.toISOString(),
      expiresAt: this._expiresAt?.toISOString(),
      ipAddress: this._ipAddress,
      userAgent: this._userAgent || undefined,
      metadata: this._metadata || undefined,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  // Getters de solo lectura
  get id(): ConsentId {
    return this._id;
  }

  get visitorId(): VisitorId {
    return this._visitorId;
  }

  get consentType(): ConsentType {
    return this._consentType;
  }

  get status(): ConsentStatus {
    return this._status;
  }

  get version(): ConsentVersion {
    return this._version;
  }

  get grantedAt(): Date {
    return this._grantedAt;
  }

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get ipAddress(): string {
    return this._ipAddress;
  }

  get userAgent(): string | null {
    return this._userAgent;
  }

  get metadata(): Record<string, unknown> | null {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
