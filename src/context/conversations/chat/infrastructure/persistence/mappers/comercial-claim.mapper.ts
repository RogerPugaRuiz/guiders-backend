import { ComercialClaim } from '../../../domain/claim/comercial-claim';
import { ComercialClaimMongooseEntity } from '../entity/comercial-claim-mongoose.mongodb-entity';

export class ComercialClaimMapper {
  /**
   * Convierte una entidad de dominio a entidad de persistencia MongoDB
   */
  static toPersistence(claim: ComercialClaim): ComercialClaimMongooseEntity {
    const primitives = claim.toPrimitives();

    const entity = new ComercialClaimMongooseEntity();
    entity._id = primitives.id;
    entity.chat_id = primitives.chatId;
    entity.comercial_id = primitives.comercialId;
    entity.claimed_at = primitives.claimedAt;
    entity.released_at = primitives.releasedAt;
    entity.status = primitives.status;

    return entity;
  }

  /**
   * Convierte una entidad de persistencia MongoDB a entidad de dominio
   */
  static fromPersistence(entity: ComercialClaimMongooseEntity): ComercialClaim {
    return ComercialClaim.fromPrimitives({
      id: entity._id,
      chatId: entity.chat_id,
      comercialId: entity.comercial_id,
      claimedAt: entity.claimed_at,
      releasedAt: entity.released_at,
      status: entity.status,
    });
  }
}
