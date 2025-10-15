import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsentAuditLogRepository } from '../../../domain/consent-audit-log.repository';
import { ConsentAuditLog } from '../../../domain/consent-audit-log.aggregate';
import { ConsentAuditLogMongoEntity } from '../entity/consent-audit-log-mongo.entity';
import { ConsentAuditLogMapper } from '../mappers/consent-audit-log.mapper';
import { Result, ok, err, okVoid } from '../../../../shared/domain/result';
import { ConsentPersistenceError } from '../../../domain/errors/consent.error';
import { VisitorId } from '../../../../visitors-v2/domain/value-objects/visitor-id';
import { ConsentId } from '../../../domain/value-objects/consent-id';

/**
 * Implementación MongoDB del repositorio de audit logs de consentimientos
 */
@Injectable()
export class MongoConsentAuditLogRepositoryImpl
  implements ConsentAuditLogRepository
{
  constructor(
    @InjectModel(ConsentAuditLogMongoEntity.name)
    private readonly model: Model<ConsentAuditLogMongoEntity>,
  ) {}

  async save(
    auditLog: ConsentAuditLog,
  ): Promise<Result<void, ConsentPersistenceError>> {
    try {
      const persistence = ConsentAuditLogMapper.toPersistence(auditLog);

      // Los audit logs son write-only (inmutables), solo insert
      await this.model.create(persistence);

      return okVoid();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al guardar audit log: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findByVisitorId(
    visitorId: VisitorId,
  ): Promise<Result<ConsentAuditLog[], ConsentPersistenceError>> {
    try {
      const entities = await this.model
        .find({ visitorId: visitorId.getValue() })
        .sort({ timestamp: -1 })
        .exec();

      const auditLogs = entities.map((entity) =>
        ConsentAuditLogMapper.toDomain(entity),
      );

      return ok(auditLogs);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar audit logs por visitorId: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findByConsentId(
    consentId: ConsentId,
  ): Promise<Result<ConsentAuditLog[], ConsentPersistenceError>> {
    try {
      const entities = await this.model
        .find({ consentId: consentId.value })
        .sort({ timestamp: -1 })
        .exec();

      const auditLogs = entities.map((entity) =>
        ConsentAuditLogMapper.toDomain(entity),
      );

      return ok(auditLogs);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar audit logs por consentId: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Result<ConsentAuditLog[], ConsentPersistenceError>> {
    try {
      const entities = await this.model
        .find({
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ timestamp: -1 })
        .exec();

      const auditLogs = entities.map((entity) =>
        ConsentAuditLogMapper.toDomain(entity),
      );

      return ok(auditLogs);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al buscar audit logs por rango de fechas: ${message}`,
      );
      return err(persistenceError);
    }
  }

  async countByVisitorId(
    visitorId: VisitorId,
  ): Promise<Result<number, ConsentPersistenceError>> {
    try {
      const count = await this.model
        .countDocuments({ visitorId: visitorId.getValue() })
        .exec();

      return ok(count);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const persistenceError = new ConsentPersistenceError(
        `Error al contar audit logs por visitorId: ${message}`,
      );
      return err(persistenceError);
    }
  }
}
