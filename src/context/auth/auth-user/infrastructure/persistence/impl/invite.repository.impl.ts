import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteRepository } from '../../../domain/invite.repository';
import { Invite } from '../../../domain/invite';
import { InviteId } from '../../../domain/value-objects/invite-id';
import { Criteria } from 'src/context/shared/domain/criteria';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';
import { InviteMapper } from './invite.mapper';
import { InviteTypeOrmEntity } from '../entity/invite-typeorm.entity';
import {
  InvitePersistenceError,
  InviteNotFoundError,
} from '../../../domain/errors/invite.errors';

// Implementación del repositorio de Invite usando TypeORM
@Injectable()
export class InviteRepositoryImpl implements InviteRepository {
  constructor(
    @InjectRepository(InviteTypeOrmEntity)
    private readonly inviteRepository: Repository<InviteTypeOrmEntity>,
  ) {}

  async save(invite: Invite): Promise<Result<void, DomainError>> {
    try {
      const entity = InviteMapper.toPersistence(invite);
      await this.inviteRepository.save(entity);
      return okVoid();
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al guardar Invite: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async findById(id: InviteId): Promise<Result<Invite, DomainError>> {
    try {
      const entity = await this.inviteRepository.findOne({
        where: { id: id.value },
      });
      if (!entity) {
        return err(new InviteNotFoundError());
      }
      return ok(InviteMapper.fromPersistence(entity));
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al buscar Invite: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async findAll(): Promise<Result<Invite[], DomainError>> {
    try {
      const entities = await this.inviteRepository.find();
      return ok(entities.map((e) => InviteMapper.fromPersistence(e)));
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al buscar Invites: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async delete(id: InviteId): Promise<Result<void, DomainError>> {
    try {
      await this.inviteRepository.delete({ id: id.value });
      return okVoid();
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al eliminar Invite: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async update(invite: Invite): Promise<Result<void, DomainError>> {
    try {
      const entity = InviteMapper.toPersistence(invite);
      await this.inviteRepository.save(entity);
      return okVoid();
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al actualizar Invite: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async findOne(
    criteria: Criteria<Invite>,
  ): Promise<Result<Invite, DomainError>> {
    try {
      const fieldNameMap = {
        id: 'id',
        userId: 'userId',
        email: 'email',
        token: 'token',
        expiresAt: 'expiresAt',
      };
      const { sql, parameters } = CriteriaConverter.toPostgresSql(
        criteria,
        'invites',
        fieldNameMap,
      );
      const entity = await this.inviteRepository
        .createQueryBuilder('invites')
        .where(sql.replace(/^WHERE /, ''))
        .setParameters(parameters)
        .getOne();
      if (!entity) {
        return err(new InviteNotFoundError());
      }
      return ok(InviteMapper.fromPersistence(entity));
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al buscar Invite: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }

  async match(
    criteria: Criteria<Invite>,
  ): Promise<Result<Invite[], DomainError>> {
    try {
      const fieldNameMap = {
        id: 'id',
        userId: 'userId',
        email: 'email',
        token: 'token',
        expiresAt: 'expiresAt',
      };
      const { sql, parameters } = CriteriaConverter.toPostgresSql(
        criteria,
        'invites',
        fieldNameMap,
      );
      const entities = await this.inviteRepository
        .createQueryBuilder('invites')
        .where(sql.replace(/^WHERE /, ''))
        .setParameters(parameters)
        .getMany();
      return ok(entities.map((e) => InviteMapper.fromPersistence(e)));
    } catch (error) {
      return err(
        new InvitePersistenceError(
          'Error al buscar Invites: ' +
            (error instanceof Error ? error.message : String(error)),
        ),
      );
    }
  }
}
