import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { SyncChatToCrmCommandHandler } from '../sync-chat-to-crm-command.handler';
import { SyncChatToCrmCommand } from '../sync-chat-to-crm.command';
import {
  ICrmSyncRecordRepository,
  CRM_SYNC_RECORD_REPOSITORY,
  CrmSyncRecordPrimitives,
} from '../../../domain/crm-sync-record.repository';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../../domain/crm-company-config.repository';
import {
  ICrmSyncServiceFactory,
  ICrmSyncService,
  CRM_SYNC_SERVICE_FACTORY,
  CrmCompanyConfigPrimitives,
} from '../../../domain/services/crm-sync.service';
import { ok, okVoid, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { LeadsPersistenceError } from '../../../domain/errors/leads.error';

describe('SyncChatToCrmCommandHandler', () => {
  let handler: SyncChatToCrmCommandHandler;
  let syncRecordRepository: jest.Mocked<ICrmSyncRecordRepository>;
  let configRepository: jest.Mocked<ICrmCompanyConfigRepository>;
  let crmServiceFactory: jest.Mocked<ICrmSyncServiceFactory>;
  let crmAdapter: jest.Mocked<ICrmSyncService>;
  let eventBus: jest.Mocked<EventBus>;

  const companyId = Uuid.random().value;
  const visitorId = Uuid.random().value;
  const chatId = Uuid.random().value;

  const crmConfig: CrmCompanyConfigPrimitives = {
    id: Uuid.random().value,
    companyId,
    crmType: 'leadcars',
    enabled: true,
    syncChatConversations: true,
    triggerEvents: ['chat_closed'],
    config: {
      clienteToken: 'token123',
      concesionarioId: 1,
      tipoLeadDefault: 2,
      useSandbox: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const syncRecord: CrmSyncRecordPrimitives = {
    id: Uuid.random().value,
    visitorId,
    companyId,
    crmType: 'leadcars',
    status: 'synced',
    externalLeadId: 'LEAD-001',
    retryCount: 0,
    chatsSynced: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseCommand = new SyncChatToCrmCommand({
    chatId,
    visitorId,
    companyId,
    messages: [{ content: 'Hola', senderType: 'visitor', sentAt: new Date() }],
    startedAt: new Date(),
    closedAt: new Date(),
  });

  beforeEach(async () => {
    syncRecordRepository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findPending: jest.fn(),
      findFailedForRetry: jest.fn(),
      markChatSynced: jest.fn(),
      isChatSynced: jest.fn(),
      findByExternalLeadId: jest.fn(),
      countByStatus: jest.fn(),
      findByCompanyId: jest.fn(),
      findFailedByCompanyId: jest.fn(),
    };

    configRepository = {
      save: jest.fn(),
      findByCompanyAndType: jest.fn(),
      findById: jest.fn(),
      findByCompanyId: jest.fn(),
      findEnabledByCompanyId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByCompanyAndType: jest.fn(),
      exists: jest.fn(),
      findCompaniesWithEnabledCrm: jest.fn(),
    };

    crmAdapter = {
      crmType: 'leadcars',
      syncLead: jest.fn(),
      syncChat: jest.fn(),
      testConnection: jest.fn(),
      validateConfig: jest.fn(),
    };

    crmServiceFactory = {
      getAdapter: jest.fn().mockReturnValue(crmAdapter),
      isSupported: jest.fn(),
      getSupportedTypes: jest.fn(),
      getSupportedCrmTypes: jest.fn(),
    };

    eventBus = {
      publish: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        SyncChatToCrmCommandHandler,
        { provide: CRM_SYNC_RECORD_REPOSITORY, useValue: syncRecordRepository },
        { provide: CRM_COMPANY_CONFIG_REPOSITORY, useValue: configRepository },
        { provide: CRM_SYNC_SERVICE_FACTORY, useValue: crmServiceFactory },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<SyncChatToCrmCommandHandler>(
      SyncChatToCrmCommandHandler,
    );
  });

  describe('execute', () => {
    it('debe sincronizar el chat exitosamente con el CRM', async () => {
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(ok(syncRecord));
      syncRecordRepository.isChatSynced.mockResolvedValue(ok(false));
      crmAdapter.syncChat.mockResolvedValue(okVoid());
      syncRecordRepository.markChatSynced.mockResolvedValue(okVoid());

      const result = await handler.execute(baseCommand);

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('debe retornar lista vacía si no hay configs con syncChatConversations habilitado', async () => {
      const configNoSync = { ...crmConfig, syncChatConversations: false };
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([configNoSync]),
      );

      const result = await handler.execute(baseCommand);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
      expect(crmAdapter.syncChat).not.toHaveBeenCalled();
    });

    it('debe saltar sincronización si el lead no está sincronizado con el CRM', async () => {
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(ok(null));

      const result = await handler.execute(baseCommand);

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results[0].skipped).toBe(true);
      expect(results[0].success).toBe(false);
      expect(crmAdapter.syncChat).not.toHaveBeenCalled();
    });

    it('debe saltar sincronización si el chat ya fue sincronizado', async () => {
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(ok(syncRecord));
      syncRecordRepository.isChatSynced.mockResolvedValue(ok(true));

      const result = await handler.execute(baseCommand);

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results[0].skipped).toBe(true);
      expect(results[0].success).toBe(true);
      expect(crmAdapter.syncChat).not.toHaveBeenCalled();
    });

    it('debe retornar error si falla la sincronización en el CRM', async () => {
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(ok(syncRecord));
      syncRecordRepository.isChatSynced.mockResolvedValue(ok(false));
      crmAdapter.syncChat.mockResolvedValue(
        err(new LeadsPersistenceError('API error')),
      );

      const result = await handler.execute(baseCommand);

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
