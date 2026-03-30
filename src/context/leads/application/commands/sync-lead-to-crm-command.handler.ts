import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { SyncLeadToCrmCommand } from './sync-lead-to-crm.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../domain/lead-contact-data.repository';
import {
  ICrmSyncRecordRepository,
  CRM_SYNC_RECORD_REPOSITORY,
  CrmSyncRecordPrimitives,
} from '../../domain/crm-sync-record.repository';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../domain/crm-company-config.repository';
import {
  ICrmSyncServiceFactory,
  CRM_SYNC_SERVICE_FACTORY,
  CrmCompanyConfigPrimitives,
} from '../../domain/services/crm-sync.service';
import {
  LeadSyncedToCrmEvent,
  LeadSyncFailedEvent,
} from '../../domain/events/lead-synced.event';
import {
  LeadContactDataNotFoundError,
  CrmNotConfiguredError,
} from '../../domain/errors/leads.error';

export interface SyncLeadResult {
  crmType: string;
  success: boolean;
  externalLeadId?: string;
  error?: string;
}

@CommandHandler(SyncLeadToCrmCommand)
export class SyncLeadToCrmCommandHandler
  implements ICommandHandler<SyncLeadToCrmCommand>
{
  private readonly logger = new Logger(SyncLeadToCrmCommandHandler.name);

  constructor(
    @Inject(LEAD_CONTACT_DATA_REPOSITORY)
    private readonly contactDataRepository: ILeadContactDataRepository,
    @Inject(CRM_SYNC_RECORD_REPOSITORY)
    private readonly syncRecordRepository: ICrmSyncRecordRepository,
    @Inject(CRM_COMPANY_CONFIG_REPOSITORY)
    private readonly configRepository: ICrmCompanyConfigRepository,
    @Inject(CRM_SYNC_SERVICE_FACTORY)
    private readonly crmServiceFactory: ICrmSyncServiceFactory,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: SyncLeadToCrmCommand,
  ): Promise<Result<SyncLeadResult[], DomainError>> {
    const { visitorId, companyId, crmType } = command.input;

    this.logger.log(
      `Sincronizando lead para visitor ${visitorId} con CRM${crmType ? ` (${crmType})` : 's habilitados'}`,
    );

    // 1. Obtener datos de contacto del lead
    const contactDataResult = await this.contactDataRepository.findByVisitorId(
      visitorId,
      companyId,
    );

    if (contactDataResult.isErr()) {
      return err(contactDataResult.error);
    }

    const contactData = contactDataResult.unwrap();
    if (!contactData) {
      return err(new LeadContactDataNotFoundError(visitorId));
    }

    // 2. Obtener configuraciones de CRM habilitadas
    let configs: CrmCompanyConfigPrimitives[] = [];

    if (crmType) {
      const singleConfigResult =
        await this.configRepository.findByCompanyAndType(companyId, crmType);
      if (singleConfigResult.isErr()) {
        return err(singleConfigResult.error);
      }
      const singleConfig = singleConfigResult.unwrap();
      if (singleConfig) {
        configs = [singleConfig];
      }
    } else {
      const multiConfigResult =
        await this.configRepository.findEnabledByCompanyId(companyId);
      if (multiConfigResult.isErr()) {
        return err(multiConfigResult.error);
      }
      configs = multiConfigResult.unwrap();
    }

    if (configs.length === 0) {
      this.logger.warn(
        `No hay configuraciones de CRM habilitadas para empresa ${companyId}`,
      );
      return err(new CrmNotConfiguredError(companyId, crmType));
    }

    // 3. Sincronizar con cada CRM habilitado
    const results: SyncLeadResult[] = [];

    for (const config of configs) {
      if (!config.enabled) {
        continue;
      }

      const result = await this.syncWithSingleCrm(
        contactData,
        config,
        visitorId,
        companyId,
      );
      results.push(result);
    }

    return ok(results);
  }

  private async syncWithSingleCrm(
    contactData: ReturnType<
      typeof this.contactDataRepository.findByVisitorId
    > extends Promise<Result<infer T, any>>
      ? NonNullable<T>
      : never,
    config: CrmCompanyConfigPrimitives,
    visitorId: string,
    companyId: string,
  ): Promise<SyncLeadResult> {
    const crmType = config.crmType;

    this.logger.log(`Sincronizando con ${crmType}...`);

    // Verificar si ya existe un registro de sincronización
    const existingRecordResult =
      await this.syncRecordRepository.findByVisitorId(
        visitorId,
        companyId,
        crmType,
      );

    if (existingRecordResult.isErr()) {
      return {
        crmType,
        success: false,
        error: existingRecordResult.error.message,
      };
    }

    const existingRecord = existingRecordResult.unwrap();

    // Si ya está sincronizado, no volver a sincronizar
    if (existingRecord?.status === 'synced' && existingRecord.externalLeadId) {
      this.logger.log(
        `Lead ya sincronizado con ${crmType}: ${existingRecord.externalLeadId}`,
      );
      return {
        crmType,
        success: true,
        externalLeadId: existingRecord.externalLeadId,
      };
    }

    // Obtener el adapter del CRM
    const adapter = this.crmServiceFactory.getAdapter(crmType);
    if (!adapter) {
      this.logger.error(`No se encontró adapter para CRM: ${crmType}`);
      return {
        crmType,
        success: false,
        error: `Adapter no disponible para ${crmType}`,
      };
    }

    // Sincronizar
    const syncResult = await adapter.syncLead(contactData, config);

    if (syncResult.isErr()) {
      // Registrar fallo
      await this.handleSyncFailure(
        existingRecord,
        visitorId,
        companyId,
        crmType,
        syncResult.error.message,
      );

      // Publicar evento de fallo
      this.eventBus.publish(
        new LeadSyncFailedEvent({
          visitorId,
          companyId,
          crmType,
          errorCode: 'SYNC_FAILED',
          errorMessage: syncResult.error.message,
          retryCount: (existingRecord?.retryCount || 0) + 1,
          failedAt: new Date().toISOString(),
        }),
      );

      return {
        crmType,
        success: false,
        error: syncResult.error.message,
      };
    }

    const syncData = syncResult.unwrap();

    // Guardar/actualizar registro de sincronización
    await this.saveSyncRecord(
      existingRecord,
      visitorId,
      companyId,
      crmType,
      syncData.externalLeadId,
      syncData.metadata,
    );

    // Publicar evento de éxito
    this.eventBus.publish(
      new LeadSyncedToCrmEvent({
        visitorId,
        companyId,
        crmType,
        externalLeadId: syncData.externalLeadId,
        syncedAt: new Date().toISOString(),
        metadata: syncData.metadata,
      }),
    );

    this.logger.log(
      `Lead sincronizado exitosamente con ${crmType}: ${syncData.externalLeadId}`,
    );

    return {
      crmType,
      success: true,
      externalLeadId: syncData.externalLeadId,
    };
  }

  private async saveSyncRecord(
    existingRecord: CrmSyncRecordPrimitives | null,
    visitorId: string,
    companyId: string,
    crmType: string,
    externalLeadId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const now = new Date();

    if (existingRecord) {
      const updated: CrmSyncRecordPrimitives = {
        ...existingRecord,
        externalLeadId,
        status: 'synced',
        lastSyncAt: now,
        lastError: undefined,
        metadata: {
          ...existingRecord.metadata,
          ...metadata,
        },
        updatedAt: now,
      };

      await this.syncRecordRepository.update(updated);
    } else {
      const record: CrmSyncRecordPrimitives = {
        id: Uuid.random().value,
        visitorId,
        companyId,
        crmType: crmType as any,
        externalLeadId,
        status: 'synced',
        lastSyncAt: now,
        retryCount: 0,
        chatsSynced: [],
        metadata,
        createdAt: now,
        updatedAt: now,
      };

      await this.syncRecordRepository.save(record);
    }
  }

  private async handleSyncFailure(
    existingRecord: CrmSyncRecordPrimitives | null,
    visitorId: string,
    companyId: string,
    crmType: string,
    errorMessage: string,
  ): Promise<void> {
    const now = new Date();

    if (existingRecord) {
      const updated: CrmSyncRecordPrimitives = {
        ...existingRecord,
        status: 'failed',
        lastError: errorMessage,
        retryCount: existingRecord.retryCount + 1,
        updatedAt: now,
      };

      await this.syncRecordRepository.update(updated);
    } else {
      const record: CrmSyncRecordPrimitives = {
        id: Uuid.random().value,
        visitorId,
        companyId,
        crmType: crmType as any,
        status: 'failed',
        lastError: errorMessage,
        retryCount: 1,
        chatsSynced: [],
        createdAt: now,
        updatedAt: now,
      };

      await this.syncRecordRepository.save(record);
    }
  }
}
