import { Injectable, Logger } from '@nestjs/common';
import { UserAccountRepository } from '../../domain/user-account.repository';
import { UserAccount } from '../../domain/user-account';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserAccountEntity } from '../user-account.entity';
import { UserAccountMapper } from '../user-account-mapper';

@Injectable()
export class UserAccountService implements UserAccountRepository {
  private readonly logger = new Logger(UserAccountService.name);
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly userAccountMapper: UserAccountMapper,
  ) {}
  async findById(id: string): Promise<UserAccount | null> {
    if (!id) {
      this.logger.error('ID is required');
      return null;
    }
    const user = await this.entityManager.findOne(UserAccountEntity, {
      where: { id },
    });
    return this.userAccountMapper.fromEntity(user);
  }
  async findByEmail(email: string): Promise<UserAccount | null> {
    if (!email) {
      this.logger.error('Email is required');
      return null;
    }
    const user = await this.entityManager.findOne(UserAccountEntity, {
      where: { email },
    });
    return this.userAccountMapper.fromEntity(user);
  }
  async save(userAccount: UserAccount): Promise<void> {
    const userAccountEntity = this.userAccountMapper.toEntity(userAccount);
    try {
      await this.entityManager.save(UserAccountEntity, userAccountEntity);
    } catch (error) {
      this.logger.error('Error saving user account', error);
      throw error;
    }
    return;
  }
}
