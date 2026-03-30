import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { CloseChatViewCommandHandler } from '../close-chat-view.command-handler';
import { CloseChatViewCommand } from '../close-chat-view.command';
import { CHAT_V2_REPOSITORY } from '../../../domain/chat.repository';
import { ChatViewClosedEvent } from '../../../domain/events/chat-view-closed.event';
import { Chat } from '../../../domain/entities/chat.aggregate';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

class TestDomainError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

describe('CloseChatViewCommandHandler', () => {
  let handler: CloseChatViewCommandHandler;
  let mockChatRepository: jest.Mocked<any>;
  let mockEventBus: jest.Mocked<EventBus>;

  const mockChatId = Uuid.random().value;
  const mockVisitorId = Uuid.random().value;
  const mockCommercialId = Uuid.random().value;

  const createMockChat = (visitorId: string) => {
    return Chat.fromPrimitives({
      id: mockChatId,
      status: 'PENDING',
      priority: 'NORMAL',
      visitorId: visitorId,
      availableCommercialIds: [],
      totalMessages: 0,
      visitorInfo: { name: 'Test Visitor' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(async () => {
    mockChatRepository = {
      findById: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloseChatViewCommandHandler,
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<CloseChatViewCommandHandler>(
      CloseChatViewCommandHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('deberia cerrar vista del chat exitosamente para un visitante', async () => {
      // Arrange
      const mockChat = createMockChat(mockVisitorId);
      mockChatRepository.findById.mockResolvedValue(ok(mockChat));

      const command = new CloseChatViewCommand(mockChatId, mockVisitorId, [
        'visitor',
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockChatRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(ChatViewClosedEvent),
      );
    });

    it('deberia cerrar vista del chat exitosamente para un comercial', async () => {
      // Arrange
      const mockChat = createMockChat(mockVisitorId);
      mockChatRepository.findById.mockResolvedValue(ok(mockChat));

      const command = new CloseChatViewCommand(mockChatId, mockCommercialId, [
        'commercial',
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            view: expect.objectContaining({
              chatId: mockChatId,
              userId: mockCommercialId,
              userRole: 'commercial',
            }),
          }),
        }),
      );
    });

    it('deberia retornar error si el chat no existe', async () => {
      // Arrange
      mockChatRepository.findById.mockResolvedValue(
        err(new TestDomainError('Chat not found')),
      );

      const command = new CloseChatViewCommand(mockChatId, mockVisitorId, [
        'visitor',
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Chat no encontrado');
      }
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('deberia retornar error si el visitante no tiene acceso al chat', async () => {
      // Arrange
      const otherVisitorId = Uuid.random().value;
      const mockChat = createMockChat(otherVisitorId);
      mockChatRepository.findById.mockResolvedValue(ok(mockChat));

      const command = new CloseChatViewCommand(mockChatId, mockVisitorId, [
        'visitor',
      ]);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('No tienes acceso');
      }
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('deberia usar el timestamp proporcionado', async () => {
      // Arrange
      const mockChat = createMockChat(mockVisitorId);
      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      const customTimestamp = '2024-11-15T10:30:00Z';

      const command = new CloseChatViewCommand(
        mockChatId,
        mockVisitorId,
        ['visitor'],
        customTimestamp,
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            view: expect.objectContaining({
              closedAt: new Date(customTimestamp),
            }),
          }),
        }),
      );
    });
  });
});
