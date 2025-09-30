import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { AssignChatToCommercialCommandHandler } from '../assign-chat-to-commercial.command-handler';
import { AssignChatToCommercialCommand } from '../assign-chat-to-commercial.command';
import { CHAT_V2_REPOSITORY } from '../../../domain/chat.repository';
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from '../../../../commercial/domain/commercial-connection.domain-service';
// Removed unused imports
// import { Chat } from '../../../domain/entities/chat.aggregate';
// import { ChatId } from '../../../domain/value-objects/chat-id';
// import { ChatStatus } from '../../../domain/value-objects/chat-status';
import { ok, err } from '../../../../shared/domain/result';
import { AssignChatToCommercialError } from './assign-chat-to-commercial.error';

describe('AssignChatToCommercialCommandHandler', () => {
  let handler: AssignChatToCommercialCommandHandler;
  let mockChatRepository: jest.Mocked<any>;
  let mockCommercialConnectionService: jest.Mocked<any>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    mockChatRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByCommercialId: jest.fn(),
    };

    mockCommercialConnectionService = {
      isCommercialOnline: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignChatToCommercialCommandHandler,
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
          useValue: mockCommercialConnectionService,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<AssignChatToCommercialCommandHandler>(
      AssignChatToCommercialCommandHandler,
    );
  });

  describe('execute', () => {
    const validCommand = new AssignChatToCommercialCommand({
      chatId: 'chat-123',
      commercialId: 'commercial-456',
      assignedBy: 'admin-789',
      reason: 'manual',
    });

    it('debe asignar exitosamente un chat a un comercial', async () => {
      // Given
      const mockChat = {
        status: { canBeAssigned: () => true, value: 'PENDING' },
        assignCommercial: jest.fn().mockReturnValue('assigned-chat'),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.save.mockResolvedValue(ok(undefined));
      mockCommercialConnectionService.isCommercialOnline.mockResolvedValue(
        true,
      );
      mockChatRepository.findByCommercialId.mockResolvedValue(ok({ total: 2 }));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual({
        assignedCommercialId: 'commercial-456',
      });
      expect(mockChat.assignCommercial).toHaveBeenCalled();
      expect(mockChatRepository.save).toHaveBeenCalledWith('assigned-chat');
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
        'assigned-chat',
      );
    });

    it('debe retornar error si el chat no existe', async () => {
      // Given
      mockChatRepository.findById.mockResolvedValue(
        err(new AssignChatToCommercialError('Chat no encontrado')),
      );

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      result.fold(
        (error) => {
          expect(error.message).toContain('Chat no encontrado');
        },
        () => {
          throw new Error('Se esperaba un error, pero el resultado fue Ok');
        },
      );
    });

    it('debe retornar error si el chat no puede ser asignado', async () => {
      // Given
      const mockChat = {
        status: { canBeAssigned: () => false, value: 'CLOSED' },
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      result.fold(
        (error) => {
          expect(error.message).toContain(
            'no puede ser asignado en estado CLOSED',
          );
        },
        () => {
          throw new Error('Se esperaba un error, pero el resultado fue Ok');
        },
      );
    });

    it('debe advertir si el comercial está offline pero continuar con la asignación', async () => {
      // Given
      const mockChat = {
        status: { canBeAssigned: () => true, value: 'PENDING' },
        assignCommercial: jest.fn().mockReturnValue('assigned-chat'),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.save.mockResolvedValue(ok(undefined));
      mockCommercialConnectionService.isCommercialOnline.mockResolvedValue(
        false,
      );
      mockChatRepository.findByCommercialId.mockResolvedValue(ok({ total: 1 }));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isOk()).toBe(true);
      expect(
        mockCommercialConnectionService.isCommercialOnline,
      ).toHaveBeenCalled();
    });

    it('debe advertir si el comercial tiene muchos chats activos', async () => {
      // Given
      const mockChat = {
        status: { canBeAssigned: () => true, value: 'PENDING' },
        assignCommercial: jest.fn().mockReturnValue('assigned-chat'),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.save.mockResolvedValue(ok(undefined));
      mockCommercialConnectionService.isCommercialOnline.mockResolvedValue(
        true,
      );
      mockChatRepository.findByCommercialId.mockResolvedValue(ok({ total: 6 }));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isOk()).toBe(true);
      expect(mockChatRepository.findByCommercialId).toHaveBeenCalled();
    });

    it('debe retornar error si falla al guardar el chat', async () => {
      // Given
      const mockChat = {
        status: { canBeAssigned: () => true, value: 'PENDING' },
        assignCommercial: jest.fn().mockReturnValue('assigned-chat'),
      };

      mockChatRepository.findById.mockResolvedValue(ok(mockChat));
      mockChatRepository.save.mockResolvedValue(
        err(new AssignChatToCommercialError('Error de persistencia')),
      );
      mockCommercialConnectionService.isCommercialOnline.mockResolvedValue(
        true,
      );
      mockChatRepository.findByCommercialId.mockResolvedValue(ok({ total: 2 }));

      // When
      const result = await handler.execute(validCommand);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Error de persistencia');
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
  });
});
