import { ApiKeyEntity } from 'src/context/auth/api-key/infrastructure/api-key.entity';
import { VisitorAccount } from '../../domain/models/visitor-account.aggregate';
import { VisitorAccountEntity } from '../visitor-account.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VisitorAccountMapper {
  toDomain(entity: VisitorAccountEntity): VisitorAccount {
    return VisitorAccount.fromPrimitives({
      id: entity.id,
      clientID: parseInt(entity.clientID),
      userAgent: entity.userAgent,
      createdAt: entity.createdAt,
      apiKey: entity.apiKey.apiKey,
      lastLoginAt: entity.lastLoginAt,
    });
  }

  toEntity(domain: VisitorAccount): VisitorAccountEntity {
    const entity = new VisitorAccountEntity();
    entity.id = domain.toPrimitives().id;
    entity.clientID = domain.toPrimitives().clientID.toString();
    entity.userAgent = domain.toPrimitives().userAgent;
    entity.createdAt = domain.toPrimitives().createdAt;
    entity.lastLoginAt = domain.toPrimitives().lastLoginAt;
    // Aquí se asume que apiKey ya está mapeado a ApiKeyEntity
    entity.apiKey = { apiKey: domain.toPrimitives().apiKey } as ApiKeyEntity;
    return entity;
  }
}
