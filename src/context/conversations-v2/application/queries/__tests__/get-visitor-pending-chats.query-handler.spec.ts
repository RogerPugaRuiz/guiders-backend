import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorPendingChatsQueryHandler } from '../get-visitor-pending-chats.query-handler';
import { GetVisitorPendingChatsQuery } from '../get-visitor-pending-chats.query';
import { CHAT_V2_REPOSITORY, IChatRepository } from '../../../domain/chat.repository';
import {
  MESSAGE_V2_REPOSITORY,
  IMessageRepository,
} from '../../../domain/message.repository';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import {
  TRACKING_EVENT_REPOSITORY,
  ITrackingEventRepository,
} from 'src/context/tracking/domain/tracking-event.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { Chat } from '../../../domain/entities/chat.aggregate';
import { ChatId } from '../../../domain/value-objects/chat-id';
import { ChatStatus } from '../../../domain/value-objects/chat-status';
import { ChatPriority } from '../../../domain/value-objects/chat-priority';
import { VisitorId as ChatVisitorId } from '../../../domain/value-objects/visitor-id';
import { VisitorInfo } from '../../../domain/value-objects/visitor-info';
import { VisitorNotFoundError } from 'src/context/visitors-v2/domain/errors/visitor.error';
import { ChatPersistenceError } from '../../../infrastructure/persistence/impl/mongo-chat.repository.impl';

describe('GetVisitorPendingChatsQueryHandler', () => {
  let handler: GetVisitorPendingChatsQueryHandler;
  let chatRepository: jest.Mocked<IChatRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let trackingEventRepository: jest.Mocked<ITrackingEventRepository>;

  beforeEach(async () => {
    // Mock repositories
    chatRepository = {
      findByVisitorId: jest.fn(),
      countPendingCreatedBefore: jest.fn(),
    } as any;

    messageRepository = {
      findByChatId: jest.fn(),
    } as any;

    visitorRepository = {
      findById: jest.fn(),
    } as any;

    trackingEventRepository = {
      match: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorPendingChatsQueryHandler,
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: chatRepository,
        },
        {
          provide: MESSAGE_V2_REPOSITORY,
          useValue: messageRepository,
        },
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: visitorRepository,
        },
        {
          provide: TRACKING_EVENT_REPOSITORY,
          useValue: trackingEventRepository,
        },
      ],
    }).compile();

    handler = module.get<GetVisitorPendingChatsQueryHandler>(
      GetVisitorPendingChatsQueryHandler,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('debe retornar una respuesta vacía cuando no hay chats', async () => {
      // Arrange
      const query = new GetVisitorPendingChatsQuery(
        'fcc21188-04ca-4830-9d5c-38f097dffb83',
        'de919e41-f06f-4a43-b0ea-cbd0886315a9',
      );

      visitorRepository.findById.mockResolvedValue(
        err(new VisitorNotFoundError()),
      );
      chatRepository.findByVisitorId.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.pendingChats).toEqual([]);
      expect(chatRepository.findByVisitorId).toHaveBeenCalledWith(
        expect.any(ChatVisitorId),
      );
    });

    it('debe retornar chats pendientes cuando existen', async () => {
      // Arrange
      const query = new GetVisitorPendingChatsQuery(
        'fcc21188-04ca-4830-9d5c-38f097dffb83',
        'de919e41-f06f-4a43-b0ea-cbd0886315a9',
      );

      const mockChat = Chat.fromPrimitives({
        id: 'ecb67b15-6c62-454e-acf5-7fd498c5f97a',
        status: 'PENDING',
        priority: 'HIGH',
        visitorId: 'de919e41-f06f-4a43-b0ea-cbd0886315a9',
        availableCommercialIds: [],
        totalMessages: 0,
        visitorInfo: {
          name: 'Test Visitor',
        },
        createdAt: new Date('2025-09-30T10:30:00Z'),
        updatedAt: new Date('2025-09-30T10:30:00Z'),
      });

      visitorRepository.findById.mockResolvedValue(
        err(new VisitorNotFoundError()),
      );
      chatRepository.findByVisitorId.mockResolvedValue(ok([mockChat]));
      chatRepository.countPendingCreatedBefore.mockResolvedValue(ok(0));
      messageRepository.findByChatId.mockResolvedValue(
        ok({ messages: [], total: 0, hasMore: false }),
      );
      trackingEventRepository.match.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.pendingChats).toHaveLength(1);
      expect(result.pendingChats[0].chatId).toBe('ecb67b15-6c62-454e-acf5-7fd498c5f97a');
      expect(result.pendingChats[0].status).toBe('PENDING');
      expect(result.pendingChats[0].priority).toBe('HIGH');
    });

    it('debe filtrar por chatIds cuando se proporcionan', async () => {
      // Arrange
      const query = new GetVisitorPendingChatsQuery(
        'fcc21188-04ca-4830-9d5c-38f097dffb83',
        'de919e41-f06f-4a43-b0ea-cbd0886315a9',
        ['ecb67b15-6c62-454e-acf5-7fd498c5f97a'],
      );

      const mockChat1 = Chat.fromPrimitives({
        id: 'ecb67b15-6c62-454e-acf5-7fd498c5f97a',
        status: 'PENDING',
        priority: 'HIGH',
        visitorId: 'de919e41-f06f-4a43-b0ea-cbd0886315a9',
        availableCommercialIds: [],
        totalMessages: 0,
        visitorInfo: {
          name: 'Test Visitor',
        },
        createdAt: new Date('2025-09-30T10:30:00Z'),
        updatedAt: new Date('2025-09-30T10:30:00Z'),
      });

      const mockChat2 = Chat.fromPrimitives({
        id: '5cd6cfea-d487-4c6a-a516-040786540931',
        status: 'PENDING',
        priority: 'NORMAL',
        visitorId: 'de919e41-f06f-4a43-b0ea-cbd0886315a9',
        availableCommercialIds: [],
        totalMessages: 0,
        visitorInfo: {
          name: 'Test Visitor',
        },
        createdAt: new Date('2025-09-30T10:35:00Z'),
        updatedAt: new Date('2025-09-30T10:35:00Z'),
      });

      visitorRepository.findById.mockResolvedValue(
        err(new VisitorNotFoundError()),
      );
      chatRepository.findByVisitorId.mockResolvedValue(
        ok([mockChat1, mockChat2]),
      );
      chatRepository.countPendingCreatedBefore.mockResolvedValue(ok(0));
      messageRepository.findByChatId.mockResolvedValue(
        ok({ messages: [], total: 0, hasMore: false }),
      );
      trackingEventRepository.match.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.pendingChats).toHaveLength(1);
      expect(result.pendingChats[0].chatId).toBe('ecb67b15-6c62-454e-acf5-7fd498c5f97a');
    });

    it('debe excluir chats que no están en estado PENDING', async () => {
      // Arrange
      const query = new GetVisitorPendingChatsQuery(
        'fcc21188-04ca-4830-9d5c-38f097dffb83',
        'de919e41-f06f-4a43-b0ea-cbd0886315a9',
      );

      const mockPendingChat = Chat.fromPrimitives({
        id: '80f2c20b-f1b3-417b-8b7d-8cf296d14133',
        status: 'PENDING',
        priority: 'HIGH',
        visitorId: 'de919e41-f06f-4a43-b0ea-cbd0886315a9',
        availableCommercialIds: [],
        totalMessages: 0,
        visitorInfo: {
          name: 'Test Visitor',
        },
        createdAt: new Date('2025-09-30T10:30:00Z'),
        updatedAt: new Date('2025-09-30T10:30:00Z'),
      });

      const mockActiveChat = Chat.fromPrimitives({
        id: '1fa623d8-cec3-4802-bddc-a4d7da9da284',
        status: 'ACTIVE',
        priority: 'NORMAL',
        visitorId: 'de919e41-f06f-4a43-b0ea-cbd0886315a9',
        availableCommercialIds: [],
        totalMessages: 5,
        visitorInfo: {
          name: 'Test Visitor',
        },
        createdAt: new Date('2025-09-30T10:35:00Z'),
        updatedAt: new Date('2025-09-30T10:35:00Z'),
      });

      visitorRepository.findById.mockResolvedValue(
        err(new VisitorNotFoundError()),
      );
      chatRepository.findByVisitorId.mockResolvedValue(
        ok([mockPendingChat, mockActiveChat]),
      );
      chatRepository.countPendingCreatedBefore.mockResolvedValue(ok(0));
      messageRepository.findByChatId.mockResolvedValue(
        ok({ messages: [], total: 0, hasMore: false }),
      );
      trackingEventRepository.match.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.pendingChats).toHaveLength(1);
      expect(result.pendingChats[0].chatId).toBe('80f2c20b-f1b3-417b-8b7d-8cf296d14133');
    });

    it('debe manejar errores del repositorio correctamente', async () => {
      // Arrange
      const query = new GetVisitorPendingChatsQuery(
        'fcc21188-04ca-4830-9d5c-38f097dffb83',
        'de919e41-f06f-4a43-b0ea-cbd0886315a9',
      );

      visitorRepository.findById.mockResolvedValue(
        err(new VisitorNotFoundError()),
      );
      chatRepository.findByVisitorId.mockResolvedValue(
        err(new VisitorNotFoundError()),
      );

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.pendingChats).toEqual([]);
    });
  });
});
