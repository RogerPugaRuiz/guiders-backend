import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { UpdateChatParticipantsOnCommercialsUnassignedEventHandler } from '../update-chat-participants-on-commercials-unassigned.event-handler';
import { ChatCommercialsUnassignedEvent } from 'src/context/real-time/domain/events/chat-commercials-unassigned.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';
import { Optional } from 'src/context/shared/domain/optional';
import { Criteria } from 'src/context/shared/domain/criteria';
import { ChatId } from 'src/context/conversations/chat/domain/chat/value-objects/chat-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('UpdateChatParticipantsOnCommercialsUnassignedEventHandler', () => {
  let handler: UpdateChatParticipantsOnCommercialsUnassignedEventHandler;
  let mockChatRepository: Partial<IChatRepository>;
  let mockPublisher: Partial<EventPublisher>;
  let mockChat: Partial<Chat>;

  beforeEach(async () => {
    // Limpiamos los mocks
    jest.clearAllMocks();

    // Configuración de los mocks
    mockChat = {
      id: new ChatId(Uuid.random().value),
      participants: {
        getParticipant: jest.fn().mockReturnValue({
          isEmpty: () => false,
          get: () => ({ isVisitor: false, isCommercial: true }),
        }),
      } as any,
      removeCommercial: jest.fn().mockReturnThis(),
      commit: jest.fn(),
    };

    mockChatRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue(Optional.of({ chat: mockChat as Chat })),
      save: jest.fn(),
    };

    mockPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        ...mockChat,
        commit: jest.fn(),
      }),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateChatParticipantsOnCommercialsUnassignedEventHandler,
        {
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockPublisher,
        },
      ],
    }).compile();

    handler =
      module.get<UpdateChatParticipantsOnCommercialsUnassignedEventHandler>(
        UpdateChatParticipantsOnCommercialsUnassignedEventHandler,
      );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('handle', () => {
    it('debe actualizar el chat removiendo los comerciales especificados', async () => {
      // Arrange
      const chatId = Uuid.random().value;
      const commercialIds = [Uuid.random().value, Uuid.random().value];
      const event = new ChatCommercialsUnassignedEvent(chatId, commercialIds);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockChatRepository.findOne).toHaveBeenCalledWith(
        expect.any(Criteria),
      );

      // Verificamos que se llamó a removeCommercial para cada ID
      expect(mockChat.removeCommercial).toHaveBeenCalledTimes(2);

      // Verificamos que el chat se guardó y se aplicaron los eventos
      expect(mockPublisher.mergeObjectContext).toHaveBeenCalled();
      expect(mockChatRepository.save).toHaveBeenCalled();
    });

    it('debe lanzar un error cuando el chat no existe', async () => {
      // Arrange
      const chatId = Uuid.random().value;
      const commercialIds = [Uuid.random().value];
      const event = new ChatCommercialsUnassignedEvent(chatId, commercialIds);

      // Mock de findOne para devolver Optional vacío (chat no encontrado)
      (mockChatRepository.findOne as jest.Mock).mockResolvedValue(
        Optional.empty(),
      );

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow('Chat not found');
      expect(mockChatRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockChatRepository.save).not.toHaveBeenCalled();
    });

    it('debe manejar correctamente cuando la lista de comerciales está vacía', async () => {
      // Arrange
      const chatId = Uuid.random().value;
      const commercialIds: string[] = []; // Lista vacía
      const event = new ChatCommercialsUnassignedEvent(chatId, commercialIds);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockChat.removeCommercial).not.toHaveBeenCalled();
      expect(mockPublisher.mergeObjectContext).toHaveBeenCalled();
      expect(mockChatRepository.save).toHaveBeenCalled();
    });

    it('debe validar que no se intente remover participantes visitantes', async () => {
      // Arrange
      const chatId = Uuid.random().value;
      const visitorId = Uuid.random().value;
      const commercialIds = [visitorId]; // Se intenta remover un visitante
      const event = new ChatCommercialsUnassignedEvent(chatId, commercialIds);

      // Mock del participante visitante
      const mockVisitorParticipant = {
        id: visitorId,
        name: 'Test Visitor',
        isVisitor: true,
        isCommercial: false,
      };

      // Mock del chat con participantes que incluye un visitante
      const mockChatWithVisitor = {
        ...mockChat,
        participants: {
          getParticipant: jest.fn().mockReturnValue({
            isEmpty: () => false,
            get: () => mockVisitorParticipant,
          }),
        },
        removeCommercial: jest.fn().mockReturnThis(),
      };

      // Mock del repository para devolver el chat con el visitante
      (mockChatRepository.findOne as jest.Mock).mockResolvedValue({
        isEmpty: () => false,
        get: () => ({ chat: mockChatWithVisitor }),
      });

      // Mock del publisher para devolver el chat con commit
      (mockPublisher.mergeObjectContext as jest.Mock).mockReturnValue({
        ...mockChatWithVisitor,
        commit: jest.fn(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.findOne).toHaveBeenCalledTimes(1);
      // Verificar que NO se llamó a removeCommercial porque el participante es visitante
      expect(mockChatWithVisitor.removeCommercial).not.toHaveBeenCalled();
      // Verificar que el chat se guardó (el flujo continúa)
      expect(mockPublisher.mergeObjectContext).toHaveBeenCalled();
      expect(mockChatRepository.save).toHaveBeenCalled();
    });

    it('debe continuar el flujo cuando se encuentran errores al remover comerciales', async () => {
      // Arrange
      const chatId = Uuid.random().value;
      const commercialIds = [Uuid.random().value, Uuid.random().value];
      const event = new ChatCommercialsUnassignedEvent(chatId, commercialIds);

      // Mock del chat que lanza error en removeCommercial
      const mockChatWithError = {
        ...mockChat,
        participants: {
          getParticipant: jest.fn().mockReturnValue({
            isEmpty: () => false,
            get: () => ({ isVisitor: false, isCommercial: true }),
          }),
        },
        removeCommercial: jest.fn().mockImplementation(() => {
          throw new Error('Participant is not a commercial');
        }),
      };

      // Mock del repository
      (mockChatRepository.findOne as jest.Mock).mockResolvedValue({
        isEmpty: () => false,
        get: () => ({ chat: mockChatWithError }),
      });

      // Mock del publisher
      (mockPublisher.mergeObjectContext as jest.Mock).mockReturnValue({
        ...mockChatWithError,
        commit: jest.fn(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockChatRepository.findOne).toHaveBeenCalledTimes(1);
      // Verificar que se intentó remover ambos comerciales
      expect(mockChatWithError.removeCommercial).toHaveBeenCalledTimes(2);
      // Verificar que el chat se guardó a pesar de los errores
      expect(mockPublisher.mergeObjectContext).toHaveBeenCalled();
      expect(mockChatRepository.save).toHaveBeenCalled();
    });
  });
});
