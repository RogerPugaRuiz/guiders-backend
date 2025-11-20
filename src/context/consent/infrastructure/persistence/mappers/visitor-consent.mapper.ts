import { VisitorConsent } from '../../../domain/visitor-consent.aggregate';
import { VisitorConsentMongoEntity } from '../entity/visitor-consent-mongo.entity';

/**
 * Mapper para convertir entre el agregado VisitorConsent y la entidad MongoDB
 */
export class VisitorConsentMapper {
  /**
   * Convierte una entidad de MongoDB al agregado de dominio
   */
  static toDomain(entity: VisitorConsentMongoEntity): VisitorConsent {
    return VisitorConsent.fromPrimitives({
      id: entity.id,
      visitorId: entity.visitorId,
      consentType: entity.consentType,
      status: entity.status,
      version: entity.version,
      grantedAt: entity.grantedAt.toISOString(),
      revokedAt: entity.revokedAt?.toISOString(),
      expiresAt: entity.expiresAt?.toISOString(),
      ipAddress: entity.ipAddress,
      userAgent: entity.userAgent || undefined,
      metadata: entity.metadata || undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }

  /**
   * Convierte el agregado de dominio a formato de persistencia MongoDB
   */
  static toPersistence(consent: VisitorConsent): Record<string, unknown> {
    const primitives = consent.toPrimitives();

    return {
      id: primitives.id,
      visitorId: primitives.visitorId,
      consentType: primitives.consentType,
      status: primitives.status,
      version: primitives.version,
      grantedAt: new Date(primitives.grantedAt),
      revokedAt: primitives.revokedAt ? new Date(primitives.revokedAt) : null,
      expiresAt: primitives.expiresAt ? new Date(primitives.expiresAt) : null,
      ipAddress: primitives.ipAddress,
      userAgent: primitives.userAgent ?? null,
      metadata: primitives.metadata ?? null,
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
    };
  }
}
