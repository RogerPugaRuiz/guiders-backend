import { Invite } from '../../../domain/invite.aggregate';
import { InviteTypeOrmEntity } from '../entity/invite-typeorm.entity';
import { InviteId } from '../../../domain/value-objects/invite-id';
import { UserId } from '../../../domain/value-objects/user-id';
import { InviteEmail } from '../../../domain/value-objects/invite-email';
import { InviteToken } from '../../../domain/value-objects/invite-token';
import { InviteExpiration } from '../../../domain/value-objects/invite-expiration';

// Mapper para convertir entre la entidad de dominio Invite y la entidad de persistencia InviteTypeOrmEntity
export class InviteMapper {
  // Convierte de dominio a persistencia
  static toPersistence(invite: Invite): InviteTypeOrmEntity {
    const entity = new InviteTypeOrmEntity();
    entity.id = invite.id.value;
    entity.userId = invite.userId.value;
    entity.email = invite.email.value;
    entity.token = invite.token.value;
    entity.expiresAt = new Date(invite.expiresAt.value);
    return entity;
  }

  // Convierte de persistencia a dominio
  static fromPersistence(entity: InviteTypeOrmEntity): Invite {
    return Invite.create({
      id: new InviteId(entity.id),
      userId: new UserId(entity.userId),
      email: new InviteEmail(entity.email),
      token: new InviteToken(entity.token),
      expiresAt: new InviteExpiration(entity.expiresAt.toISOString()),
    });
  }
}
