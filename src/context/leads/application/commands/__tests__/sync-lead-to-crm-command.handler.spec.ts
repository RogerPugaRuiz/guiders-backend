import { Test } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { SyncLeadToCrmCommandHandler } from '../sync-lead-to-crm-command.handler';
import { SyncLeadToCrmCommand } from '../sync-lead-to-crm.command';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../../domain/lead-contact-data.repository';
import {
  ICrmSyncRecordRepository,
  CRM_SYNC_RECORD_REPOSITORY,
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
  LeadContactDataPrimitives,
} from '../../../domain/services/crm-sync.service';
import { ok, okVoid, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import {
  LeadContactDataNotFoundError,
  CrmNotConfiguredError,
  LeadsPersistenceError,
} from '../../../domain/errors/leads.error';

describe('SyncLeadToCrmCommandHandler', () => {
  let handler: SyncLeadToCrmCommandHandler;
  let contactDataRepository: jest.Mocked<ILeadContactDataRepository>;
  let syncRecordRepository: jest.Mocked<ICrmSyncRecordRepository>;
  let configRepository: jest.Mocked<ICrmCompanyConfigRepository>;
  let crmServiceFactory: jest.Mocked<ICrmSyncServiceFactory>;
  let crmAdapter: jest.Mocked<ICrmSyncService>;
  let eventBus: jest.Mocked<EventBus>;

  const companyId = Uuid.random().value;
  const visitorId = Uuid.random().value;

  const contactData: LeadContactDataPrimitives = {
    id: Uuid.random().value,
    visitorId,
    companyId,
    nombre: 'Ana',
    apellidos: 'Lopez',
    email: 'ana@example.com',
    extractedAt: new Date(),
  };

  const crmConfig: CrmCompanyConfigPrimitives = {
    id: Uuid.random().value,
    companyId,
    crmType: 'leadcars',
    enabled: true,
    syncChatConversations: false,
    triggerEvents: ['lifecycle_to_lead'],
    config: {
      clienteToken: 'token123',
      concesionarioId: 1,
      tipoLeadDefault: 2,
      useSandbox: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    contactDataRepository = {
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByEmail: jest.fn(),
      exists: jest.fn(),
      findByChatId: jest.fn(),
      findById: jest.fn(),
      findByCompanyId: jest.fn(),
    };

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
        SyncLeadToCrmCommandHandler,
        {
          provide: LEAD_CONTACT_DATA_REPOSITORY,
          useValue: contactDataRepository,
        },
        { provide: CRM_SYNC_RECORD_REPOSITORY, useValue: syncRecordRepository },
        { provide: CRM_COMPANY_CONFIG_REPOSITORY, useValue: configRepository },
        { provide: CRM_SYNC_SERVICE_FACTORY, useValue: crmServiceFactory },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<SyncLeadToCrmCommandHandler>(
      SyncLeadToCrmCommandHandler,
    );
  });

  describe('execute', () => {
    it('debe sincronizar el lead exitosamente con el CRM', async () => {
      const externalLeadId = 'LEAD-001';
      contactDataRepository.findByVisitorId.mockResolvedValue(ok(contactData));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(ok(null));
      crmAdapter.syncLead.mockResolvedValue(ok({ externalLeadId }));
      syncRecordRepository.save.mockResolvedValue(okVoid());

      const result = await handler.execute(
        new SyncLeadToCrmCommand({ visitorId, companyId }),
      );

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].externalLeadId).toBe(externalLeadId);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('debe retornar error cuando no se encuentran datos de contacto del lead', async () => {
      contactDataRepository.findByVisitorId.mockResolvedValue(ok(null));

      const result = await handler.execute(
        new SyncLeadToCrmCommand({ visitorId, companyId }),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LeadContactDataNotFoundError);
      }
    });

    it('debe retornar error cuando no hay configuraciones CRM habilitadas', async () => {
      contactDataRepository.findByVisitorId.mockResolvedValue(ok(contactData));
      configRepository.findEnabledByCompanyId.mockResolvedValue(ok([]));

      const result = await handler.execute(
        new SyncLeadToCrmCommand({ visitorId, companyId }),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(CrmNotConfiguredError);
      }
    });

    it('debe retornar success si el lead ya estaba sincronizado (status synced)', async () => {
      const externalLeadId = 'LEAD-EXISTING';
      const existingRecord = {
        id: Uuid.random().value,
        visitorId,
        companyId,
        crmType: 'leadcars' as const,
        status: 'synced' as const,
        externalLeadId,
        retryCount: 0,
        chatsSynced: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      contactDataRepository.findByVisitorId.mockResolvedValue(ok(contactData));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(
        ok(existingRecord),
      );

      const result = await handler.execute(
        new SyncLeadToCrmCommand({ visitorId, companyId }),
      );

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results[0].success).toBe(true);
      expect(results[0].externalLeadId).toBe(externalLeadId);
      expect(crmAdapter.syncLead).not.toHaveBeenCalled();
    });

    it('debe registrar fallo y publicar evento cuando la sincronización falla en el CRM', async () => {
      contactDataRepository.findByVisitorId.mockResolvedValue(ok(contactData));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      syncRecordRepository.findByVisitorId.mockResolvedValue(ok(null));
      crmAdapter.syncLead.mockResolvedValue(
        err(new LeadsPersistenceError('API error')),
      );
      syncRecordRepository.save.mockResolvedValue(okVoid());

      const result = await handler.execute(
        new SyncLeadToCrmCommand({ visitorId, companyId }),
      );

      expect(result.isOk()).toBe(true);
      const results = result.unwrap();
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('debe retornar error si falla la consulta al repositorio de datos de contacto', async () => {
      contactDataRepository.findByVisitorId.mockResolvedValue(
        err(new LeadsPersistenceError('DB error')),
      );

      const result = await handler.execute(
        new SyncLeadToCrmCommand({ visitorId, companyId }),
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('DB error');
      }
    });
  });
});
