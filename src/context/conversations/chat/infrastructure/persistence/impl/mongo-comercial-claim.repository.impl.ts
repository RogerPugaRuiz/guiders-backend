import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { IComercialClaimRepository } from '../../../domain/claim/comercial-claim.repository';
import { ComercialClaim } from '../../../domain/claim/comercial-claim';
import { ComercialClaimId } from '../../../domain/claim/value-objects/comercial-claim-id';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import { ComercialId } from '../../../domain/claim/value-objects/comercial-id';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import {
  ComercialClaimMongooseEntity,
  ComercialClaimDocument,
} from '../entity/comercial-claim-mongoose.mongodb-entity';
import { ComercialClaimMapper } from '../mappers/comercial-claim.mapper';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { RepositoryError } from '../../../domain/claim/errors/repository.error';

@Injectable()
export class MongoComercialClaimRepository
  implements IComercialClaimRepository
{
  constructor(
    @InjectModel(ComercialClaimMongooseEntity.name)
    private readonly claimModel: Model<ComercialClaimDocument>,
  ) {}

  /**
   * Guarda un claim en la base de datos
   */
  async save(claim: ComercialClaim): Promise<Result<void, DomainError>> {
    try {
      const entity = ComercialClaimMapper.toPersistence(claim);
      await this.claimModel.findByIdAndUpdate(entity._id, entity, {
        upsert: true,
        new: true,
      });
      return ok(undefined);
    } catch (error: any) {
      return err(
        new RepositoryError(
          `Error saving claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Busca un claim por su ID
   */
  async findById(
    id: ComercialClaimId,
  ): Promise<Result<ComercialClaim | null, DomainError>> {
    try {
      const entity = await this.claimModel.findById(id.value);
      if (!entity) {
        return ok(null);
      }
      const claim = ComercialClaimMapper.fromPersistence(entity);
      return ok(claim);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error finding claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Elimina un claim por su ID
   */
  async delete(id: ComercialClaimId): Promise<Result<void, DomainError>> {
    try {
      await this.claimModel.findByIdAndDelete(id.value);
      return ok(undefined);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error deleting claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Actualiza un claim
   */
  async update(claim: ComercialClaim): Promise<Result<void, DomainError>> {
    return this.save(claim);
  }

  /**
   * Busca un claim que coincida con el criterio
   */
  async findOne(
    criteria: Criteria<ComercialClaim>,
  ): Promise<Result<ComercialClaim | null, DomainError>> {
    try {
      const mongoQuery = this.buildMongoQuery(criteria);
      const entity = await this.claimModel.findOne(mongoQuery);

      if (!entity) {
        return ok(null);
      }

      const claim = ComercialClaimMapper.fromPersistence(entity);
      return ok(claim);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error finding claim: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Busca claims que coincidan con el criterio
   */
  async match(
    criteria: Criteria<ComercialClaim>,
  ): Promise<Result<ComercialClaim[], DomainError>> {
    try {
      const mongoQuery = this.buildMongoQuery(criteria);
      const entities = await this.claimModel.find(mongoQuery);

      const claims = entities.map((entity) =>
        ComercialClaimMapper.fromPersistence(entity),
      );

      return ok(claims);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error finding claims: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Busca claims que coincidan con el criterio
   */
  async find(
    criteria: Criteria<ComercialClaim>,
  ): Promise<{ claims: ComercialClaim[] }> {
    const mongoQuery = this.buildMongoQuery(criteria);
    const entities = await this.claimModel.find(mongoQuery);

    const claims = entities.map((entity) =>
      ComercialClaimMapper.fromPersistence(entity),
    );

    return { claims };
  }

  /**
   * Obtiene todos los claims
   */
  async findAll(): Promise<Result<ComercialClaim[], DomainError>> {
    try {
      const entities = await this.claimModel.find();
      const claims = entities.map((entity) =>
        ComercialClaimMapper.fromPersistence(entity),
      );
      return ok(claims);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error finding all claims: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Obtiene los IDs de chats que tienen claims activos
   */
  async getActiveChatIds(): Promise<Result<string[], DomainError>> {
    try {
      const result = await this.claimModel.distinct('chat_id', {
        status: 'active',
      });
      return ok(result);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error getting active chat IDs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Encuentra el claim activo para un chat específico
   */
  async findActiveClaimForChat(
    chatId: ChatId,
  ): Promise<Result<ComercialClaim | null, DomainError>> {
    try {
      const entity = await this.claimModel.findOne({
        chat_id: chatId.value,
        status: 'active',
      });

      if (!entity) {
        return ok(null);
      }

      const claim = ComercialClaimMapper.fromPersistence(entity);
      return ok(claim);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error finding active claim for chat: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Encuentra todos los claims activos de un comercial
   */
  async findActiveClaimsByComercial(
    comercialId: ComercialId,
  ): Promise<Result<ComercialClaim[], DomainError>> {
    try {
      const entities = await this.claimModel.find({
        comercial_id: comercialId.value,
        status: 'active',
      });

      const claims = entities.map((entity) =>
        ComercialClaimMapper.fromPersistence(entity),
      );

      return ok(claims);
    } catch (error) {
      return err(
        new RepositoryError(
          `Error finding active claims by comercial: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Construye una consulta MongoDB a partir de un Criteria
   */
  private buildMongoQuery(
    criteria: Criteria<ComercialClaim>,
  ): FilterQuery<ComercialClaimDocument> {
    // Convertir a consulta simple MongoDB
    const mongoQuery: FilterQuery<ComercialClaimDocument> = {};

    criteria.filters.forEach((filter) => {
      if (filter instanceof Filter) {
        const fieldNameMap: Record<string, string> = {
          id: '_id',
          chatId: 'chat_id',
          comercialId: 'comercial_id',
          claimedAt: 'claimed_at',
          releasedAt: 'released_at',
          status: 'status',
        };

        const mongoField =
          fieldNameMap[String(filter.field)] || String(filter.field);

        switch (filter.operator) {
          case Operator.EQUALS:
            mongoQuery[mongoField] = filter.value;
            break;
          case Operator.NOT_EQUALS:
            mongoQuery[mongoField] = { $ne: filter.value };
            break;
          case Operator.IN:
            mongoQuery[mongoField] = { $in: filter.value };
            break;
          case Operator.NOT_IN:
            mongoQuery[mongoField] = { $nin: filter.value };
            break;
          case Operator.IS_NULL:
            mongoQuery[mongoField] = null;
            break;
          case Operator.IS_NOT_NULL:
            mongoQuery[mongoField] = { $ne: null };
            break;
          default:
            mongoQuery[mongoField] = filter.value;
        }
      }
    });

    return mongoQuery;
  }
}
