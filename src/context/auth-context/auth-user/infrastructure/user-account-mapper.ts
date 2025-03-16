import { Injectable } from '@nestjs/common';
import { UserAccount } from '../domain/user-account';
import { UserAccountEntity } from './user-account.entity';

@Injectable()
export class UserAccountMapper {
  fromEntity(userAccountEntity: UserAccountEntity | null): UserAccount | null {
    if (!userAccountEntity) {
      return null;
    }
    return UserAccount.fromPrimitives({
      id: userAccountEntity.id,
      email: userAccountEntity.email,
      password: userAccountEntity.password,
      createdAt: userAccountEntity.createdAt,
      updatedAt: userAccountEntity.updatedAt,
      lastLoginAt: userAccountEntity.lastLoginAt,
    });
  }

  toEntity(userAccount: UserAccount): UserAccountEntity {
    const userAccountEntity = new UserAccountEntity();
    userAccountEntity.id = userAccount.id.getValue();
    userAccountEntity.email = userAccount.email.getValue();
    userAccountEntity.password = userAccount.password.getValue();
    userAccountEntity.createdAt = userAccount.createdAt.getValue();
    userAccountEntity.updatedAt = userAccount.updatedAt.getValue();
    userAccountEntity.lastLoginAt = userAccount.lastLoginAt.isDefined()
      ? userAccount.lastLoginAt.get().getValue()
      : null;
    return userAccountEntity;
  }
}
