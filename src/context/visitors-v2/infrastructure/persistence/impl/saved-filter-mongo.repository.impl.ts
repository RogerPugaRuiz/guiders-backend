import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ok, err } from 'src/context/shared/domain/result';
import {
  SavedFilterPersistenceError,
  SavedFilterNotFoundError,
} from '../../../domain/errors/saved-filter.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import {
  SavedFilter,
  SavedFilterPrimitives,
} from '../../../domain/entities/saved-filter.aggregate';
import { SavedFilterRepository } from '../../../domain/saved-filter.repository';
import {
  SavedFilterMongoEntity,
  SavedFilterDocument,
} from '../entity/saved-filter-mongo.entity';

/**
 * Implementación MongoDB del repositorio de filtros guardados
 */
@Injectable()
export class SavedFilterMongoRepositoryImpl implements SavedFilterRepository {
  private readonly logger = new Logger(SavedFilterMongoRepositoryImpl.name);

  constructor(
    @InjectModel(SavedFilterMongoEntity.name)
    private readonly savedFilterModel: Model<SavedFilterDocument>,
  ) {}

  async save(
    filter: SavedFilter,
  ): Promise<Result<void, SavedFilterPersistenceError>> {
    try {
      const primitives = filter.toPrimitives();

      await this.savedFilterModel.findOneAndUpdate(
        { id: primitives.id },
        {
          $set: {
            userId: primitives.userId,
            tenantId: primitives.tenantId,
            name: primitives.name,
            description: primitives.description,
            filters: primitives.filters,
            sort: primitives.sort,
            createdAt: new Date(primitives.createdAt),
            updatedAt: new Date(primitives.updatedAt),
          },
          $setOnInsert: {
            id: primitives.id,
          },
        },
        { upsert: true, new: true },
      );

      return ok(undefined);
    } catch (error) {
      this.logger.error('Error saving saved filter', error);
      return err(new SavedFilterPersistenceError('Error al guardar el filtro'));
    }
  }

  async findById(
    id: Uuid,
  ): Promise<Result<SavedFilter | null, SavedFilterPersistenceError>> {
    try {
      const doc = await this.savedFilterModel.findOne({ id: id.value }).exec();

      if (!doc) {
        return ok(null);
      }

      return ok(SavedFilter.fromPrimitives(this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error('Error finding saved filter by id', error);
      return err(new SavedFilterPersistenceError('Error al buscar el filtro'));
    }
  }

  async findByUserAndTenant(
    userId: Uuid,
    tenantId: Uuid,
  ): Promise<Result<SavedFilter[], SavedFilterPersistenceError>> {
    try {
      const docs = await this.savedFilterModel
        .find({
          userId: userId.value,
          tenantId: tenantId.value,
        })
        .sort({ updatedAt: -1 })
        .exec();

      const filters = docs.map((doc) =>
        SavedFilter.fromPrimitives(this.toPrimitives(doc)),
      );

      return ok(filters);
    } catch (error) {
      this.logger.error('Error finding saved filters by user', error);
      return err(
        new SavedFilterPersistenceError(
          'Error al buscar los filtros del usuario',
        ),
      );
    }
  }

  async delete(
    id: Uuid,
  ): Promise<
    Result<void, SavedFilterNotFoundError | SavedFilterPersistenceError>
  > {
    try {
      const result = await this.savedFilterModel
        .deleteOne({ id: id.value })
        .exec();

      if (result.deletedCount === 0) {
        return err(new SavedFilterNotFoundError());
      }

      return ok(undefined);
    } catch (error) {
      this.logger.error('Error deleting saved filter', error);
      return err(
        new SavedFilterPersistenceError('Error al eliminar el filtro'),
      );
    }
  }

  async countByUser(
    userId: Uuid,
    tenantId: Uuid,
  ): Promise<Result<number, SavedFilterPersistenceError>> {
    try {
      const count = await this.savedFilterModel
        .countDocuments({
          userId: userId.value,
          tenantId: tenantId.value,
        })
        .exec();

      return ok(count);
    } catch (error) {
      this.logger.error('Error counting saved filters', error);
      return err(
        new SavedFilterPersistenceError('Error al contar los filtros'),
      );
    }
  }

  private toPrimitives(doc: SavedFilterDocument): SavedFilterPrimitives {
    return {
      id: doc.id,
      userId: doc.userId,
      tenantId: doc.tenantId,
      name: doc.name,
      description: doc.description,
      filters: doc.filters,
      sort: doc.sort,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
