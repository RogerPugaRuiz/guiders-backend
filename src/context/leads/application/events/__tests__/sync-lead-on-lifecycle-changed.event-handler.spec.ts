import { Test } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { SyncLeadOnLifecycleChangedEventHandler } from '../sync-lead-on-lifecycle-changed.event-handler';
import { VisitorLifecycleChangedEvent } from 'src/context/visitors-v2/domain/events/visitor-state-changed.event';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../../domain/crm-company-config.repository';
import {
  ILeadContactDataRepository,
  LEAD_CONTACT_DATA_REPOSITORY,
} from '../../../domain/lead-contact-data.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { LeadsPersistenceError } from '../../../domain/errors/leads.error';
import { CrmCompanyConfigPrimitives } from '../../../domain/services/crm-sync.service';

describe('SyncLeadOnLifecycleChangedEventHandler', () => {
  let handler: SyncLeadOnLifecycleChangedEventHandler;
  let commandBus: jest.Mocked<CommandBus>;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let configRepository: jest.Mocked<ICrmCompanyConfigRepository>;
  let contactDataRepository: jest.Mocked<ILeadContactDataRepository>;

  const visitorId = Uuid.random().value;
  const companyId = Uuid.random().value;

  const mockVisitor = {
    toPrimitives: jest
      .fn()
      .mockReturnValue({ id: visitorId, tenantId: companyId }),
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

  const contactData = {
    id: Uuid.random().value,
    visitorId,
    companyId,
    email: 'lead@example.com',
    extractedAt: new Date(),
  };

  const buildEvent = (newLifecycle: string, previousLifecycle = 'VISITOR') =>
    new VisitorLifecycleChangedEvent({
      id: visitorId,
      newLifecycle,
      previousLifecycle,
      changedAt: new Date().toISOString(),
    });

  beforeEach(async () => {
    commandBus = { execute: jest.fn().mockResolvedValue(ok([])) } as any;

    visitorRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findBySessionId: jest.fn(),
      findByCompanyId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByTenantId: jest.fn(),
      exists: jest.fn(),
    } as any;

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

    const module = await Test.createTestingModule({
      providers: [
        SyncLeadOnLifecycleChangedEventHandler,
        { provide: CommandBus, useValue: commandBus },
        { provide: VISITOR_V2_REPOSITORY, useValue: visitorRepository },
        { provide: CRM_COMPANY_CONFIG_REPOSITORY, useValue: configRepository },
        {
          provide: LEAD_CONTACT_DATA_REPOSITORY,
          useValue: contactDataRepository,
        },
      ],
    }).compile();

    handler = module.get<SyncLeadOnLifecycleChangedEventHandler>(
      SyncLeadOnLifecycleChangedEventHandler,
    );
  });

  describe('handle', () => {
    it('debe despachar SyncLeadToCrmCommand cuando el lifecycle cambia a LEAD con datos de contacto', async () => {
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      contactDataRepository.findByVisitorId.mockResolvedValue(
        ok(contactData as any),
      );

      await handler.handle(buildEvent('LEAD'));

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ visitorId, companyId }),
        }),
      );
    });

    it('debe ignorar el evento si el nuevo lifecycle no es LEAD', async () => {
      await handler.handle(buildEvent('CUSTOMER'));

      expect(visitorRepository.findById).not.toHaveBeenCalled();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si no hay CRMs habilitados para la empresa', async () => {
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(ok([]));

      await handler.handle(buildEvent('LEAD'));

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si no hay datos de contacto del visitor', async () => {
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      contactDataRepository.findByVisitorId.mockResolvedValue(ok(null));

      await handler.handle(buildEvent('LEAD'));

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si el contacto no tiene email ni teléfono', async () => {
      const contactSinDatos = {
        ...contactData,
        email: undefined,
        telefono: undefined,
      };
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      contactDataRepository.findByVisitorId.mockResolvedValue(
        ok(contactSinDatos as any),
      );

      await handler.handle(buildEvent('LEAD'));

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si no hay CRMs con trigger lifecycle_to_lead', async () => {
      const configSinTrigger = { ...crmConfig, triggerEvents: ['chat_closed'] };
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([configSinTrigger]),
      );

      await handler.handle(buildEvent('LEAD'));

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe manejar error del repositorio de visitor sin lanzar excepción', async () => {
      visitorRepository.findById.mockResolvedValue(
        err(new LeadsPersistenceError('DB error')) as any,
      );

      await expect(handler.handle(buildEvent('LEAD'))).resolves.toBeUndefined();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });
});
