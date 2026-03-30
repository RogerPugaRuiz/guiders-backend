import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { ICrmCompanyConfigRepository } from '../../../domain/crm-company-config.repository';
import {
  CrmType,
  CrmCompanyConfigPrimitives,
} from '../../../domain/services/crm-sync.service';
import {
  CrmCompanyConfigSchema,
  CrmCompanyConfigDocument,
} from '../schemas/crm-company-config.schema';
import { LeadsPersistenceError } from '../../../domain/errors/leads.error';

@Injectable()
export class MongoCrmCompanyConfigRepositoryImpl
  implements ICrmCompanyConfigRepository
{
  private readonly logger = new Logger(
    MongoCrmCompanyConfigRepositoryImpl.name,
  );

  constructor(
    @InjectModel(CrmCompanyConfigSchema.name)
    private readonly model: Model<CrmCompanyConfigDocument>,
  ) {}

  async save(
    config: CrmCompanyConfigPrimitives,
  ): Promise<Result<void, DomainError>> {
    try {
      await this.model.create(this.toSchema(config));
      this.logger.log(
        `Configuración CRM ${config.crmType} creada para empresa ${config.companyId}`,
      );
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error guardando configuración CRM: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findByCompanyAndType(
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<CrmCompanyConfigPrimitives | null, DomainError>> {
    try {
      const doc = await this.model.findOne({ companyId, crmType }).lean();
      if (!doc) {
        return ok(null);
      }
      return ok(this.toPrimitives(doc));
    } catch (error) {
      this.logger.error(
        `Error buscando configuración: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findById(
    id: string,
  ): Promise<Result<CrmCompanyConfigPrimitives | null, DomainError>> {
    try {
      const doc = await this.model.findOne({ id }).lean();
      if (!doc) {
        return ok(null);
      }
      return ok(this.toPrimitives(doc));
    } catch (error) {
      this.logger.error(
        `Error buscando configuración por id: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findByCompanyId(
    companyId: string,
  ): Promise<Result<CrmCompanyConfigPrimitives[], DomainError>> {
    try {
      const docs = await this.model.find({ companyId }).lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando configuraciones por empresa: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findEnabledByCompanyId(
    companyId: string,
  ): Promise<Result<CrmCompanyConfigPrimitives[], DomainError>> {
    try {
      const docs = await this.model.find({ companyId, enabled: true }).lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando configuraciones habilitadas: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async update(
    config: CrmCompanyConfigPrimitives,
  ): Promise<Result<void, DomainError>> {
    try {
      const result = await this.model.findOneAndUpdate(
        { id: config.id },
        { $set: this.toSchema(config) },
        { new: true },
      );

      if (!result) {
        return err(
          new LeadsPersistenceError(
            `No se encontró configuración con id ${config.id}`,
          ),
        );
      }

      this.logger.log(`Configuración CRM actualizada: ${config.id}`);
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error actualizando configuración: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    try {
      await this.model.deleteOne({ id });
      this.logger.log(`Configuración CRM eliminada: ${id}`);
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error eliminando configuración: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async deleteByCompanyAndType(
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<void, DomainError>> {
    try {
      await this.model.deleteOne({ companyId, crmType });
      this.logger.log(
        `Configuración CRM ${crmType} eliminada para empresa ${companyId}`,
      );
      return okVoid();
    } catch (error) {
      this.logger.error(
        `Error eliminando configuración: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async exists(
    companyId: string,
    crmType: CrmType,
  ): Promise<Result<boolean, DomainError>> {
    try {
      const count = await this.model.countDocuments({ companyId, crmType });
      return ok(count > 0);
    } catch (error) {
      this.logger.error(
        `Error verificando existencia: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  async findCompaniesWithEnabledCrm(
    crmType: CrmType,
  ): Promise<Result<CrmCompanyConfigPrimitives[], DomainError>> {
    try {
      const docs = await this.model.find({ crmType, enabled: true }).lean();
      return ok(docs.map((doc) => this.toPrimitives(doc)));
    } catch (error) {
      this.logger.error(
        `Error buscando empresas con CRM habilitado: ${error.message}`,
        error.stack,
      );
      return err(new LeadsPersistenceError(error.message));
    }
  }

  private toSchema(
    config: CrmCompanyConfigPrimitives,
  ): Partial<CrmCompanyConfigSchema> {
    return {
      id: config.id,
      companyId: config.companyId,
      crmType: config.crmType,
      enabled: config.enabled,
      syncChatConversations: config.syncChatConversations,
      triggerEvents: config.triggerEvents,
      config: config.config,
      updatedAt: config.updatedAt,
    };
  }

  private toPrimitives(
    doc: CrmCompanyConfigSchema,
  ): CrmCompanyConfigPrimitives {
    return {
      id: doc.id,
      companyId: doc.companyId,
      crmType: doc.crmType as CrmType,
      enabled: doc.enabled,
      syncChatConversations: doc.syncChatConversations,
      triggerEvents: doc.triggerEvents,
      config: doc.config,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
