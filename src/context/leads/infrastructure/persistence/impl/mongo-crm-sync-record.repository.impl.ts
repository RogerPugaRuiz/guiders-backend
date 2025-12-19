import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  ICrmSyncRecordRepository,
  CrmSyncRecordPrimitives,
  CrmSyncStatus,
} from '../../../domain/crm-sync-record.repository';
import { CrmType } from '../../../domain/services/crm-sync.service';
import {
  CrmSyncRecordSchema,
  CrmSyncRecordDocument,
} from '../schemas/crm-sync-record.schema';
import { LeadsPersistenceError } from '../../../domain/errors/leads.error';

@Injectable()
export class MongoCrmSyncRecordRepositoryImpl
  implements ICrmSyncRecordRepository
{
  private readonly logger = new Logger(MongoCrmSyncRecordRepositoryImpl.name);

  constructor(
    @InjectModel(CrmSyncRecordSchema.name)
    private readonly model: Model<CrmSyncRecordDocument>,
  ) {}

  async save(
    record: CrmSyncRecordPrimitives,
  ): Promise<Result<void, DomainError>> {
    try {
      await this.model.create(this.toSchema(record));
      this.logger.log(
        `Registro de sincronización creado para visitor ${record.visitorId} con ${record.crmType}`,
      );
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error guardando registro de sincronización: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findByVisitorId(
    visitorId: string,
    companyId: string,
    crmType?: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives | null, DomainError>> {
    try {
      const query: Record<string, unknown> = { visitorId, companyId };
      if (crmType) {
        query.crmType = crmType;
      }

      const doc = await this.model.findOne(query).lean();
      if (!doc) {
        return ok(null);
      }
      return ok(this.toPrimitives(doc));
    } catch (error) {
      this.logger.error(
        `Error buscando registro por visitorId: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findById(
    id: string,
  ): Promise<Result<CrmSyncRecordPrimitives | null, DomainError>> {
    try {
      const doc = await this.model.findOne({ id }).lean();
      if (!doc) {
        return ok(null);
      }
      return ok(this.toPrimitives(doc));
    } catch (error) {
      this.logger.error(
        `Error buscando registro por id: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async update(
    record: CrmSyncRecordPrimitives,
  ): Promise<Result<void, DomainError>> {
    try {
      const result = await this.model.findOneAndUpdate(
        { id: record.id },
        { $set: this.toSchema(record) },
        { new: true },
      );

      if (!result) {
        return err(
          new LeadsPersistenceError(
            `No se encontró registro con id ${record.id}`,
          ),
        );
      }

      this.logger.log(`Registro de sincronización actualizado: ${record.id}`);
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error actualizando registro: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findPending(
    companyId: string,
    crmType?: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>> {
    try {
      const query: Record<string, unknown> = { companyId, status: 'pending' };
      if (crmType) {
        query.crmType = crmType;
      }

      const docs = await this.model.find(query).lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando registros pendientes: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findFailedForRetry(
    companyId: string,
    maxRetries: number,
    crmType?: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>> {
    try {
      const query: Record<string, unknown> = {
        companyId,
        status: 'failed',
        retryCount: { $lt: maxRetries },
      };
      if (crmType) {
        query.crmType = crmType;
      }

      const docs = await this.model.find(query).lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando registros para reintento: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async markChatSynced(
    visitorId: string,
    companyId: string,
    crmType: CrmType,
    chatId: string,
  ): Promise<Result<void, DomainError>> {
    try {
      const result = await this.model.findOneAndUpdate(
        { visitorId, companyId, crmType },
        {
          $addToSet: { chatsSynced: chatId },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      );

      if (!result) {
        return err(
          new LeadsPersistenceError(
            `No se encontró registro para visitor ${visitorId}`,
          ),
        );
      }

      this.logger.log(
        `Chat ${chatId} marcado como sincronizado para visitor ${visitorId}`,
      );
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error marcando chat como sincronizado: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async isChatSynced(
    visitorId: string,
    companyId: string,
    crmType: CrmType,
    chatId: string,
  ): Promise<Result<boolean, DomainError>> {
    try {
      const count = await this.model.countDocuments({
        visitorId,
        companyId,
        crmType,
        chatsSynced: chatId,
      });
      return ok(count > 0);
    } catch (error) {
      this.logger.error(
        `Error verificando sincronización de chat: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findByExternalLeadId(
    externalLeadId: string,
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<CrmSyncRecordPrimitives | null, DomainError>> {
    try {
      const doc = await this.model
        .findOne({ externalLeadId, companyId, crmType })
        .lean();
      if (!doc) {
        return ok(null);
      }
      return ok(this.toPrimitives(doc));
    } catch (error) {
      this.logger.error(
        `Error buscando por externalLeadId: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async countByStatus(
    companyId: string,
    status: CrmSyncStatus,
    crmType?: CrmType,
  ): Promise<Result<number, DomainError>> {
    try {
      const query: Record<string, unknown> = { companyId, status };
      if (crmType) {
        query.crmType = crmType;
      }

      const count = await this.model.countDocuments(query);
      return ok(count);
    } catch (error) {
      this.logger.error(
        `Error contando registros por estado: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findByCompanyId(
    companyId: string,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>> {
    try {
      const docs = await this.model
        .find({ companyId })
        .sort({ createdAt: -1 })
        .lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando registros por empresa: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findFailedByCompanyId(
    companyId: string,
  ): Promise<Result<CrmSyncRecordPrimitives[], DomainError>> {
    try {
      const docs = await this.model
        .find({ companyId, status: 'failed' })
        .sort({ updatedAt: -1 })
        .lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando registros fallidos: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  private toSchema(
    record: CrmSyncRecordPrimitives,
  ): Partial<CrmSyncRecordSchema> {
    return {
      id: record.id,
      visitorId: record.visitorId,
      companyId: record.companyId,
      crmType: record.crmType,
      externalLeadId: record.externalLeadId,
      status: record.status,
      lastSyncAt: record.lastSyncAt,
      lastError: record.lastError,
      retryCount: record.retryCount,
      chatsSynced: record.chatsSynced,
      metadata: record.metadata,
      updatedAt: record.updatedAt,
    };
  }

  private toPrimitives(doc: CrmSyncRecordSchema): CrmSyncRecordPrimitives {
    return {
      id: doc.id,
      visitorId: doc.visitorId,
      companyId: doc.companyId,
      crmType: doc.crmType as CrmType,
      externalLeadId: doc.externalLeadId,
      status: doc.status as CrmSyncStatus,
      lastSyncAt: doc.lastSyncAt,
      lastError: doc.lastError,
      retryCount: doc.retryCount,
      chatsSynced: doc.chatsSynced,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
