import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorV2MongoEntity } from '../entity/visitor-v2-mongo.entity';
import { VisitorLifecycle } from '../../../domain/value-objects/visitor-lifecycle';

/**
 * Mapper para convertir entre el agregado de dominio VisitorV2
 * y la entidad de persistencia MongoDB
 */
export class VisitorV2Mapper {
  /**
   * Convierte de entidad de dominio a entidad de persistencia
   */
  static toPersistence(visitor: VisitorV2): Partial<VisitorV2MongoEntity> {
    const primitives = visitor.toPrimitives();

    return {
      id: primitives.id,
      tenantId: primitives.tenantId,
      siteId: primitives.siteId,
      fingerprint: primitives.fingerprint,
      lifecycle: primitives.lifecycle,
      hasAcceptedPrivacyPolicy: primitives.hasAcceptedPrivacyPolicy,
      privacyPolicyAcceptedAt: primitives.privacyPolicyAcceptedAt
        ? new Date(primitives.privacyPolicyAcceptedAt)
        : null,
      consentVersion: primitives.consentVersion,
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
      sessions: primitives.sessions.map((session) => ({
        id: session.id,
        startedAt: new Date(session.startedAt),
        lastActivityAt: new Date(session.lastActivityAt),
        endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
      })),
    };
  }

  /**
   * Convierte de entidad de persistencia a entidad de dominio
   */
  static fromPersistence(entity: VisitorV2MongoEntity): VisitorV2 {
    return VisitorV2.fromPrimitives({
      id: entity.id,
      tenantId: entity.tenantId,
      siteId: entity.siteId,
      fingerprint: entity.fingerprint,
      lifecycle: entity.lifecycle as VisitorLifecycle,
      hasAcceptedPrivacyPolicy: entity.hasAcceptedPrivacyPolicy,
      privacyPolicyAcceptedAt: entity.privacyPolicyAcceptedAt
        ? entity.privacyPolicyAcceptedAt.toISOString()
        : null,
      consentVersion: entity.consentVersion,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      sessions: entity.sessions.map((session) => ({
        id: session.id,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        endedAt: session.endedAt ? session.endedAt.toISOString() : undefined,
      })),
    });
  }
}
