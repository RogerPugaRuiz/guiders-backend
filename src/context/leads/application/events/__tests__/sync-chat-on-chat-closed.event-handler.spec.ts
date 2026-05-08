import { Test } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { SyncChatOnChatClosedEventHandler } from '../sync-chat-on-chat-closed.event-handler';
import { ChatClosedEvent } from 'src/context/conversations-v2/domain/events/chat-closed.event';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/chat.repository';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../../domain/crm-company-config.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { LeadsPersistenceError } from '../../../domain/errors/leads.error';
import { CrmCompanyConfigPrimitives } from '../../../domain/services/crm-sync.service';

describe('SyncChatOnChatClosedEventHandler', () => {
  let handler: SyncChatOnChatClosedEventHandler;
  let commandBus: jest.Mocked<CommandBus>;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let chatRepository: jest.Mocked<IChatRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let configRepository: jest.Mocked<ICrmCompanyConfigRepository>;

  const visitorId = Uuid.random().value;
  const chatId = Uuid.random().value;
  const companyId = Uuid.random().value;

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

  const mockVisitor = {
    toPrimitives: jest
      .fn()
      .mockReturnValue({ id: visitorId, tenantId: companyId }),
  };

  const mockChat = {
    toPrimitives: jest.fn().mockReturnValue({
      id: chatId,
      visitorId,
      companyId,
      status: 'CLOSED',
      totalMessages: 3,
      priority: 'normal',
      createdAt: new Date().toISOString(),
      assignedCommercialId: undefined,
    }),
  };

  const mockMessage = {
    toPrimitives: jest.fn().mockReturnValue({
      id: Uuid.random().value,
      chatId,
      senderId: visitorId,
      content: 'Hola',
      type: 'text',
      createdAt: new Date().toISOString(),
    }),
  };

  const buildClosedEvent = () =>
    new ChatClosedEvent({
      closure: {
        chatId,
        visitorId,
        closedBy: visitorId,
        reason: 'resolved',
        previousStatus: 'OPEN',
        closedAt: new Date(),
        duration: 120,
        totalMessages: 3,
      },
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

    chatRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findByVisitorId: jest.fn(),
      findByCompanyId: jest.fn(),
      delete: jest.fn(),
    } as any;

    messageRepository = {
      save: jest.fn(),
      findByChatId: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
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

    const module = await Test.createTestingModule({
      providers: [
        SyncChatOnChatClosedEventHandler,
        { provide: CommandBus, useValue: commandBus },
        { provide: VISITOR_V2_REPOSITORY, useValue: visitorRepository },
        { provide: CHAT_V2_REPOSITORY, useValue: chatRepository },
        { provide: MESSAGE_V2_REPOSITORY, useValue: messageRepository },
        { provide: CRM_COMPANY_CONFIG_REPOSITORY, useValue: configRepository },
      ],
    }).compile();

    handler = module.get<SyncChatOnChatClosedEventHandler>(
      SyncChatOnChatClosedEventHandler,
    );
  });

  describe('handle', () => {
    it('debe despachar SyncChatToCrmCommand cuando el chat se cierra y hay config habilitada', async () => {
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      chatRepository.findById.mockResolvedValue(ok(mockChat as any));
      messageRepository.findByChatId.mockResolvedValue(
        ok({
          messages: [mockMessage as any],
          total: 1,
          page: 1,
          totalPages: 1,
        } as any),
      );

      await handler.handle(buildClosedEvent());

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ chatId, visitorId, companyId }),
        }),
      );
    });

    it('debe omitir sincronización si no hay CRMs con syncChatConversations habilitado', async () => {
      const configNoSync = { ...crmConfig, syncChatConversations: false };
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([configNoSync]),
      );

      await handler.handle(buildClosedEvent());

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si el visitor no se encuentra', async () => {
      visitorRepository.findById.mockResolvedValue(
        err(new LeadsPersistenceError('not found')) as any,
      );

      await handler.handle(buildClosedEvent());

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si el chat no tiene mensajes', async () => {
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(
        ok([crmConfig]),
      );
      chatRepository.findById.mockResolvedValue(ok(mockChat as any));
      messageRepository.findByChatId.mockResolvedValue(
        ok({ messages: [], total: 0, page: 1, totalPages: 0 } as any),
      );

      await handler.handle(buildClosedEvent());

      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe omitir sincronización si no hay configuraciones CRM habilitadas', async () => {
      visitorRepository.findById.mockResolvedValue(ok(mockVisitor as any));
      configRepository.findEnabledByCompanyId.mockResolvedValue(ok([]));

      await handler.handle(buildClosedEvent());

      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });
});
