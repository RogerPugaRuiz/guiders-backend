import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VisitorV2Repository } from '../../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { VisitorFingerprint } from '../../../domain/value-objects/visitor-fingerprint';
import { SessionId } from '../../../domain/value-objects/session-id';
import { Result, ok, err, okVoid } from '../../../../shared/domain/result';
import { DomainError } from '../../../../shared/domain/domain.error';
import { VisitorV2MongoEntity } from '../entity/visitor-v2-mongo.entity';
import { VisitorV2Mapper } from '../mappers/visitor-v2.mapper';

/**
 * Error específico para problemas de persistencia de visitantes
 */
export class VisitorV2PersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class VisitorV2MongoRepositoryImpl implements VisitorV2Repository {
  private readonly logger = new Logger(VisitorV2MongoRepositoryImpl.name);

  constructor(
    @InjectModel(VisitorV2MongoEntity.name)
    private readonly visitorModel: Model<VisitorV2MongoEntity>,
  ) {}

  async save(visitor: VisitorV2): Promise<Result<void, DomainError>> {
    try {
      const persistenceEntity = VisitorV2Mapper.toPersistence(visitor);

      await this.visitorModel.findOneAndUpdate(
        { id: persistenceEntity.id },
        persistenceEntity,
        { upsert: true, new: true },
      );

      this.logger.log(`Visitante guardado: ${persistenceEntity.id}`);
      return okVoid();
    } catch (error) {
      const errorMessage = `Error al guardar visitante: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findById(id: VisitorId): Promise<Result<VisitorV2, DomainError>> {
    try {
      const entity = await this.visitorModel.findOne({ id: id.value });

      if (!entity) {
        return err(
          new VisitorV2PersistenceError(`Visitante no encontrado: ${id.value}`),
        );
      }

      const visitor = VisitorV2Mapper.fromPersistence(entity);
      return ok(visitor);
    } catch (error) {
      const errorMessage = `Error al buscar visitante por ID: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findByFingerprintAndSite(
    fingerprint: VisitorFingerprint,
    siteId: SiteId,
  ): Promise<Result<VisitorV2, DomainError>> {
    try {
      const entity = await this.visitorModel.findOne({
        fingerprint: fingerprint.value,
        siteId: siteId.value,
      });

      if (!entity) {
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado con fingerprint: ${fingerprint.value} y siteId: ${siteId.value}`,
          ),
        );
      }

      const visitor = VisitorV2Mapper.fromPersistence(entity);
      return ok(visitor);
    } catch (error) {
      const errorMessage = `Error al buscar visitante por fingerprint y site: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findBySessionId(
    sessionId: SessionId,
  ): Promise<Result<VisitorV2, DomainError>> {
    try {
      const entity = await this.visitorModel.findOne({
        'sessions.id': sessionId.value,
      });

      if (!entity) {
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado con sessionId: ${sessionId.value}`,
          ),
        );
      }

      const visitor = VisitorV2Mapper.fromPersistence(entity);
      return ok(visitor);
    } catch (error) {
      const errorMessage = `Error al buscar visitante por sessionId: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findBySiteId(
    siteId: SiteId,
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const entities = await this.visitorModel.find({ siteId: siteId.value });

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );
      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar visitantes por siteId: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findByTenantId(
    tenantId: TenantId,
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const entities = await this.visitorModel.find({
        tenantId: tenantId.value,
      });

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );
      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar visitantes por tenantId: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async delete(id: VisitorId): Promise<Result<void, DomainError>> {
    try {
      const result = await this.visitorModel.deleteOne({ id: id.value });

      if (result.deletedCount === 0) {
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado para eliminar: ${id.value}`,
          ),
        );
      }

      this.logger.log(`Visitante eliminado: ${id.value}`);
      return okVoid();
    } catch (error) {
      const errorMessage = `Error al eliminar visitante: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findAll(): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const entities = await this.visitorModel.find();

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );
      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar todos los visitantes: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async update(visitor: VisitorV2): Promise<Result<void, DomainError>> {
    try {
      const persistenceEntity = VisitorV2Mapper.toPersistence(visitor);

      const result = await this.visitorModel.updateOne(
        { id: persistenceEntity.id },
        persistenceEntity,
      );

      if (result.matchedCount === 0) {
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado para actualizar: ${persistenceEntity.id}`,
          ),
        );
      }

      this.logger.log(`Visitante actualizado: ${persistenceEntity.id}`);
      return okVoid();
    } catch (error) {
      const errorMessage = `Error al actualizar visitante: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }
}
