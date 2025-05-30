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
  });
});
