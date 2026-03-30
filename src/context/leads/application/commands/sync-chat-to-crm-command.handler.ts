import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { SyncChatToCrmCommand } from './sync-chat-to-crm.command';
import {
  ICrmSyncRecordRepository,
  CRM_SYNC_RECORD_REPOSITORY,
} from '../../domain/crm-sync-record.repository';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../domain/crm-company-config.repository';
import {
  ICrmSyncServiceFactory,
  CRM_SYNC_SERVICE_FACTORY,
  ChatSyncData,
  CrmCompanyConfigPrimitives,
} from '../../domain/services/crm-sync.service';
import { ChatSyncedToCrmEvent } from '../../domain/events/lead-synced.event';

export interface SyncChatResult {
  crmType: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

@CommandHandler(SyncChatToCrmCommand)
export class SyncChatToCrmCommandHandler
  implements ICommandHandler<SyncChatToCrmCommand>
{
  private readonly logger = new Logger(SyncChatToCrmCommandHandler.name);

  constructor(
    @Inject(CRM_SYNC_RECORD_REPOSITORY)
    private readonly syncRecordRepository: ICrmSyncRecordRepository,
    @Inject(CRM_COMPANY_CONFIG_REPOSITORY)
    private readonly configRepository: ICrmCompanyConfigRepository,
    @Inject(CRM_SYNC_SERVICE_FACTORY)
    private readonly crmServiceFactory: ICrmSyncServiceFactory,
    private readonly eventBus: EventBus,
  ) {}

  async execute(
    command: SyncChatToCrmCommand,
  ): Promise<Result<SyncChatResult[], DomainError>> {
    const { chatId, visitorId, companyId, crmType } = command.input;

    this.logger.log(
      `Sincronizando chat ${chatId} para visitor ${visitorId} con CRM${crmType ? ` (${crmType})` : 's habilitados'}`,
    );

    // 1. Obtener configuraciones de CRM habilitadas con syncChatConversations
    let allConfigs: CrmCompanyConfigPrimitives[] = [];

    if (crmType) {
      const singleConfigResult =
        await this.configRepository.findByCompanyAndType(companyId, crmType);
      if (singleConfigResult.isErr()) {
        return err(singleConfigResult.error);
      }
      const singleConfig = singleConfigResult.unwrap();
      if (singleConfig) {
        allConfigs = [singleConfig];
      }
    } else {
      const multiConfigResult =
        await this.configRepository.findEnabledByCompanyId(companyId);
      if (multiConfigResult.isErr()) {
        return err(multiConfigResult.error);
      }
      allConfigs = multiConfigResult.unwrap();
    }

    // Filtrar solo las que tienen syncChatConversations habilitado
    const configs = allConfigs.filter(
      (c) => c.enabled && c.syncChatConversations,
    );

    if (configs.length === 0) {
      this.logger.debug(
        `No hay configuraciones de CRM con sync de chats habilitado para empresa ${companyId}`,
      );
      return ok([]);
    }

    // 2. Preparar datos del chat
    const chatData: ChatSyncData = {
      chatId: command.input.chatId,
      visitorId: command.input.visitorId,
      companyId: command.input.companyId,
      messages: command.input.messages,
      startedAt: command.input.startedAt,
      closedAt: command.input.closedAt,
      summary: command.input.summary,
    };

    // 3. Sincronizar con cada CRM habilitado
    const results: SyncChatResult[] = [];

    for (const config of configs) {
      const result = await this.syncChatWithSingleCrm(
        chatData,
        config,
        visitorId,
        companyId,
      );
      results.push(result);
    }

    return ok(results);
  }

  private async syncChatWithSingleCrm(
    chatData: ChatSyncData,
    config: CrmCompanyConfigPrimitives,
    visitorId: string,
    companyId: string,
  ): Promise<SyncChatResult> {
    const crmType = config.crmType;
    const chatId = chatData.chatId;

    this.logger.log(`Sincronizando chat ${chatId} con ${crmType}...`);

    // Verificar si el lead está sincronizado con este CRM
    const syncRecordResult = await this.syncRecordRepository.findByVisitorId(
      visitorId,
      companyId,
      crmType,
    );

    if (syncRecordResult.isErr()) {
      return {
        crmType,
        success: false,
        error: syncRecordResult.error.message,
      };
    }

    const syncRecord = syncRecordResult.unwrap();

    // Si no hay registro de sincronización o no tiene externalLeadId, no podemos sincronizar el chat
    if (!syncRecord || !syncRecord.externalLeadId) {
      this.logger.warn(
        `Lead no sincronizado con ${crmType} para visitor ${visitorId}. Chat no se sincronizará.`,
      );
      return {
        crmType,
        success: false,
        skipped: true,
        skipReason: 'Lead no sincronizado con este CRM',
      };
    }

    // Verificar si el chat ya fue sincronizado
    const isSyncedResult = await this.syncRecordRepository.isChatSynced(
      visitorId,
      companyId,
      crmType,
      chatId,
    );

    if (isSyncedResult.isErr()) {
      return {
        crmType,
        success: false,
        error: isSyncedResult.error.message,
      };
    }

    if (isSyncedResult.unwrap()) {
      this.logger.debug(`Chat ${chatId} ya sincronizado con ${crmType}`);
      return {
        crmType,
        success: true,
        skipped: true,
        skipReason: 'Chat ya sincronizado',
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

    // Sincronizar el chat
    const syncResult = await adapter.syncChat(
      syncRecord.externalLeadId,
      chatData,
      config,
    );

    if (syncResult.isErr()) {
      this.logger.error(
        `Error sincronizando chat ${chatId} con ${crmType}: ${syncResult.error.message}`,
      );
      return {
        crmType,
        success: false,
        error: syncResult.error.message,
      };
    }

    // Marcar chat como sincronizado
    const markResult = await this.syncRecordRepository.markChatSynced(
      visitorId,
      companyId,
      crmType,
      chatId,
    );

    if (markResult.isErr()) {
      this.logger.warn(
        `Chat ${chatId} sincronizado pero error al marcar: ${markResult.error.message}`,
      );
    }

    // Publicar evento de éxito
    this.eventBus.publish(
      new ChatSyncedToCrmEvent({
        chatId,
        visitorId,
        companyId,
        crmType,
        externalLeadId: syncRecord.externalLeadId,
        syncedAt: new Date().toISOString(),
      }),
    );

    this.logger.log(
      `Chat ${chatId} sincronizado exitosamente con ${crmType} (lead: ${syncRecord.externalLeadId})`,
    );

    return {
      crmType,
      success: true,
    };
  }
}
