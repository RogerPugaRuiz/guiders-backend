import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import {
  RequestAgentCommandHandler,
  RequestAgentError,
} from '../request-agent.command-handler';
import { RequestAgentCommand } from '../request-agent.command';
import { CHAT_V2_REPOSITORY } from '../../../domain/chat.repository';
import { ok, err } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('RequestAgentCommandHandler', () => {
  let handler: RequestAgentCommandHandler;
  let mockChatRepository: jest.Mocked<any>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    mockChatRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestAgentCommandHandler,
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<RequestAgentCommandHandler>(
      RequestAgentCommandHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const chatId = Uuid.random().value;
    const visitorId = Uuid.random().value;

    const validCommand = new RequestAgentCommand(
      chatId,
      visitorId,
      '2025-12-01T10:30:00.000Z',
      'quick_action',
    );

    it('debe procesar exitosamente una solicitud de agente', async () => {
      // Given
      const mockUpdatedChat = {
        requestAgent: jest.fn(),
        commit: jest.fn(),
      };
      const mockChat = {
        requestAgent: jest.fn().mockReturnValue(mockUpdatedChat),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.update.mockResolvedValue(ok(undefined));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isOk()).toBe(true);
      expect(mockChat.requestAgent).toHaveBeenCalledWith(
        visitorId,
        'quick_action',
      );
      expect(mockChatRepository.update).toHaveBeenCalledWith(mockUpdatedChat);
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
        mockUpdatedChat,
      );
    });

    it('debe retornar error si el chat no existe', async () => {
      // Given
      mockChatRepository.findById.mockResolvedValue(
        err(new RequestAgentError('Chat no encontrado')),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Chat no encontrado');
      }
    });

    it('debe retornar error si el visitante no es el dueño del chat', async () => {
      // Given
      const mockChat = {
        requestAgent: jest.fn().mockImplementation(() => {
          throw new Error('El visitante no tiene permisos para este chat');
        }),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain(
          'El visitante no tiene permisos',
        );
      }
    });

    it('debe retornar error si falla al guardar el chat', async () => {
      // Given
      const mockUpdatedChat = { commit: jest.fn() };
      const mockChat = {
        requestAgent: jest.fn().mockReturnValue(mockUpdatedChat),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.update.mockResolvedValue(
        err(new RequestAgentError('Error de persistencia')),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error al actualizar chat');
      }
    });

    it('debe manejar errores inesperados', async () => {
      // Given
      mockChatRepository.findById.mockRejectedValue(
        new Error('Error inesperado'),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error inesperado');
      }
    });

    it('debe usar source por defecto si no se proporciona', async () => {
      // Given
      const commandWithoutSource = new RequestAgentCommand(
        chatId,
        visitorId,
        undefined,
        undefined,
      );

      const mockUpdatedChat = { commit: jest.fn() };
      const mockChat = {
        requestAgent: jest.fn().mockReturnValue(mockUpdatedChat),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.update.mockResolvedValue(ok(undefined));

      // When
      const result = await handler.execute(commandWithoutSource);

      // Then
      expect(result.isOk()).toBe(true);
      expect(mockChat.requestAgent).toHaveBeenCalledWith(visitorId, undefined);
    });

    it('debe llamar commit() después de persistir exitosamente', async () => {
      // Given
      const mockCommit = jest.fn();
      const mockUpdatedChat = { commit: mockCommit };
      const mockChat = {
        requestAgent: jest.fn().mockReturnValue(mockUpdatedChat),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.update.mockResolvedValue(ok(undefined));
      mockEventPublisher.mergeObjectContext.mockReturnValue({
        commit: mockCommit,
      } as any);

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isOk()).toBe(true);
      expect(mockCommit).toHaveBeenCalled();
    });
  });
});
