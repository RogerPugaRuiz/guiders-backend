import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { UpdateChatParticipantsOnCommercialsAssignedEventHandler } from '../update-chat-participants-on-commercials-assigned.event-handler';
import { ChatCommercialsAssignedEvent } from 'src/context/real-time/domain/events/chat-commercials-assigned.event';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../../../domain/chat/chat.repository';
import { IUserFinder, USER_FINDER } from '../../../../read/get-username-by-id';
import { Chat, ChatPrimitives } from '../../../../../domain/chat/chat';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Optional } from 'src/context/shared/domain/optional';

describe('UpdateChatParticipantsOnCommercialsAssignedEventHandler', () => {
  let handler: UpdateChatParticipantsOnCommercialsAssignedEventHandler;
  let chatRepository: IChatRepository;
  let userFinder: IUserFinder;
  let eventPublisher: EventPublisher;

  const chatId = Uuid.random();
  const visitorId = Uuid.random();
  const commercialId1 = Uuid.random();
  const commercialId2 = Uuid.random();
  const companyId = Uuid.random();

  beforeEach(async () => {
    const mockChatRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockUserFinder = {
      findById: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateChatParticipantsOnCommercialsAssignedEventHandler,
        {
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: USER_FINDER,
          useValue: mockUserFinder,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler =
      module.get<UpdateChatParticipantsOnCommercialsAssignedEventHandler>(
        UpdateChatParticipantsOnCommercialsAssignedEventHandler,
      );
    chatRepository = module.get<IChatRepository>(CHAT_REPOSITORY);
    userFinder = module.get<IUserFinder>(USER_FINDER);
    eventPublisher = module.get<EventPublisher>(EventPublisher);
  });

  describe('handle', () => {
    it('debe asignar comerciales al chat y guardar los cambios', async () => {
      // Arrange
      const chatPrimitives: ChatPrimitives = {
        id: chatId.value,
        companyId: companyId.value,
        participants: [
          {
            id: visitorId.value,
            name: 'Visitante',
            isCommercial: false,
            isVisitor: true,
            isOnline: true,
            assignedAt: new Date(),
            lastSeenAt: null,
            isViewing: false,
            isTyping: false,
            isAnonymous: false,
          },
        ],
        status: 'pending',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };

      const chat = Chat.fromPrimitives(chatPrimitives);
      const mockChatAggregate = {
        ...chat,
        commit: jest.fn(),
      };

      // Configurar mocks
      (chatRepository.findOne as jest.Mock).mockResolvedValue(
        Optional.of({ chat }),
      );
      (userFinder.findById as jest.Mock).mockResolvedValue('Usuario Comercial');
      (eventPublisher.mergeObjectContext as jest.Mock).mockReturnValue(
        mockChatAggregate,
      );

      // Spy en el método assignCommercial del chat
      const assignCommercialSpy = jest.spyOn(chat, 'asignCommercial');

      const event = new ChatCommercialsAssignedEvent(chatId.value, [
        commercialId1.value,
        commercialId2.value,
      ]);

      // Act
      await handler.handle(event);

      // Assert
      expect(chatRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              field: 'id',
              value: chatId.value,
            }),
          ]),
        }),
      );

      expect(userFinder.findById).toHaveBeenCalledTimes(2);
      expect(userFinder.findById).toHaveBeenCalledWith(commercialId1.value);
      expect(userFinder.findById).toHaveBeenCalledWith(commercialId2.value);

      expect(assignCommercialSpy).toHaveBeenCalledTimes(2);
      expect(assignCommercialSpy).toHaveBeenCalledWith({
        id: commercialId1.value,
        name: 'Usuario Comercial',
      });
      expect(assignCommercialSpy).toHaveBeenCalledWith({
        id: commercialId2.value,
        name: 'Usuario Comercial',
      });

      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(chat);
      expect(chatRepository.save).toHaveBeenCalledWith(mockChatAggregate);
      expect(mockChatAggregate.commit).toHaveBeenCalled();
    });

    it('debe manejar lista vacía de comerciales sin errores', async () => {
      // Arrange
      const chatPrimitives: ChatPrimitives = {
        id: chatId.value,
        companyId: companyId.value,
        participants: [
          {
            id: visitorId.value,
            name: 'Visitante',
            isCommercial: false,
            isVisitor: true,
            isOnline: true,
            assignedAt: new Date(),
            lastSeenAt: null,
            isViewing: false,
            isTyping: false,
            isAnonymous: false,
          },
        ],
        status: 'pending',
        lastMessage: null,
        lastMessageAt: null,
        createdAt: new Date(),
      };

      const chat = Chat.fromPrimitives(chatPrimitives);
      const mockChatAggregate = {
        ...chat,
        commit: jest.fn(),
      };

      (chatRepository.findOne as jest.Mock).mockResolvedValue(
        Optional.of({ chat }),
      );
      (eventPublisher.mergeObjectContext as jest.Mock).mockReturnValue(
        mockChatAggregate,
      );

      const assignCommercialSpy = jest.spyOn(chat, 'asignCommercial');

      const event = new ChatCommercialsAssignedEvent(chatId.value, []);

      // Act
      await handler.handle(event);

      // Assert
      expect(chatRepository.findOne).toHaveBeenCalled();
      expect(userFinder.findById).not.toHaveBeenCalled();
      expect(assignCommercialSpy).not.toHaveBeenCalled();
      expect(eventPublisher.mergeObjectContext).toHaveBeenCalledWith(chat);
      expect(chatRepository.save).toHaveBeenCalledWith(mockChatAggregate);
      expect(mockChatAggregate.commit).toHaveBeenCalled();
    });

    it('debe lanzar error si el chat no existe', async () => {
      // Arrange
      (chatRepository.findOne as jest.Mock).mockResolvedValue(Optional.empty());

      const event = new ChatCommercialsAssignedEvent(chatId.value, [
        commercialId1.value,
      ]);

      // Act & Assert
      await expect(handler.handle(event)).rejects.toThrow('Chat not found');
    });
  });
});
