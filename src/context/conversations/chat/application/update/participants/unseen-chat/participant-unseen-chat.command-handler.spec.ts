// Preparativos para el test del ParticipantUnseenChatCommandHandler
import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantUnseenChatCommandHandler } from './participant-unseen-chat.command-handler';
import { ParticipantUnseenChatCommand } from './participant-unseen-chat.command';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations/chat/domain/chat/chat.repository';
import { Optional } from 'src/context/shared/domain/optional';
import { Chat } from 'src/context/conversations/chat/domain/chat/chat';
import { EventPublisher, IEventPublisher } from '@nestjs/cqrs';

// Estructura básica del describe para el handler
// No se implementan pruebas, solo los preparativos

describe('ParticipantUnseenChatCommandHandler', () => {
  let commandHandler: ParticipantUnseenChatCommandHandler;
  let chatRepository: IChatRepository; // Repositorio de chat simulado

  beforeEach(async () => {
    // Configuración del módulo de testing de NestJS
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantUnseenChatCommandHandler,
        {
          provide: CHAT_REPOSITORY,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
          } as IChatRepository,
        },
        {
          provide: EventPublisher,
          useValue: {
            mergeObjectContext: jest.fn().mockReturnValue({
              commit: jest.fn(),
            }),
          } as unknown as IEventPublisher,
        },
      ],
    }).compile();

    // Instancia del handler a probar
    commandHandler = module.get<ParticipantUnseenChatCommandHandler>(
      ParticipantUnseenChatCommandHandler,
    );
    chatRepository = module.get<IChatRepository>(CHAT_REPOSITORY);

    jest.clearAllMocks(); // Limpia los mocks antes de cada prueba
  });

  // Aquí irán las pruebas

  it('should throw error if participantId is invalid', async () => {
    const command = new ParticipantUnseenChatCommand({
      participantId: Uuid.generate(),
      chatId: Uuid.generate(),
      unseenAt: new Date(),
    });

    // Simula que el chat existe y el participantId no
    const chat = Chat.fromPrimitives({
      id: command.params.chatId,
      participants: [
        {
          id: Uuid.generate(),
          name: 'Visitor',
          isCommercial: false,
          isVisitor: true,
        }, // Otro participante
      ],
      createdAt: new Date(),
      lastMessage: null,
      lastMessageAt: null,
      status: 'active',
    });

    jest
      .spyOn(chatRepository, 'findOne')
      .mockResolvedValueOnce(Optional.of({ chat })); // Simula que el chat existe
    await expect(commandHandler.execute(command)).rejects.toThrow();
  });

  it('should throw error if chatId is invalid', async () => {
    const command = new ParticipantUnseenChatCommand({
      participantId: Uuid.generate(),
      chatId: Uuid.generate(),
      unseenAt: new Date(),
    });

    jest
      .spyOn(chatRepository, 'findOne')
      .mockResolvedValueOnce(Optional.empty());

    await expect(commandHandler.execute(command)).rejects.toThrow();
  });

  it('should update lastSeenAt for the participant participantId in the chat', async () => {
    const participantId = Uuid.generate();
    const chatId = Uuid.generate();
    const unseenAt = new Date();

    const command = new ParticipantUnseenChatCommand({
      participantId,
      chatId,
      unseenAt,
    });

    // Crear un mock de la función participantUnseenAt
    const participantUnseenAtMock = jest.fn().mockReturnValue({
      // Esto simula el chat actualizado que devuelve participantUnseenAt
      id: { value: chatId },
      participantUnseenAt: jest.fn(),
      participants: [
        {
          id: participantId,
          lastUnseenAt: unseenAt,
        },
      ],
    });

    // Crear el chat mock con la función mockeada
    const chat = {
      id: { value: chatId },
      participantUnseenAt: participantUnseenAtMock,
      participants: [
        {
          id: participantId,
          name: 'Visitor',
          isCommercial: false,
          isVisitor: true,
          lastSeenAt: new Date(Date.now() - 10000), // Fecha actual menos 10 segundos
        },
      ],
    };

    // Mock or spy on the method that updates the participant's lastSeenAt
    const updateLastSeenAtSpy = jest.spyOn(commandHandler, 'execute');

    // Simula que el chat existe
    jest
      .spyOn(chatRepository, 'findOne')
      .mockResolvedValueOnce(Optional.of({ chat: chat as unknown as Chat }));

    // Simula que el chat se guarda correctamente
    jest.spyOn(chatRepository, 'save').mockResolvedValueOnce();

    // Mock para el EventPublisher
    const mergeObjectContextMock = jest.fn().mockReturnValue({
      commit: jest.fn(),
    });
    jest
      .spyOn(commandHandler['publisher'], 'mergeObjectContext')
      .mockImplementation(mergeObjectContextMock);

    // Ejecuta el comando
    await commandHandler.execute(command);

    // Verificar que el método fue llamado con los argumentos correctos
    expect(updateLastSeenAtSpy).toHaveBeenCalledWith(command);

    // Verificar que se llamó a la función participantUnseenAt con los parámetros correctos
    expect(participantUnseenAtMock).toHaveBeenCalledWith(participantId, unseenAt);

    // Verifica que el método save del repositorio fue llamado
    expect(chatRepository['save']).toHaveBeenCalled();

    // Verificar que se llamó a mergeObjectContext y commit
    expect(mergeObjectContextMock).toHaveBeenCalled();
    expect(mergeObjectContextMock().commit).toHaveBeenCalled();
  });
  
  it('should handle errors during the update process', async () => {
    const participantId = Uuid.generate();
    const chatId = Uuid.generate();
    const unseenAt = new Date();

    const command = new ParticipantUnseenChatCommand({
      participantId,
      chatId,
      unseenAt,
    });

    // Crear un mock del chat que lanza un error cuando se llama a participantUnseenAt
    const errorMessage = 'Error updating participant unseen status';
    const chat = {
      id: { value: chatId },
      participantUnseenAt: jest.fn().mockImplementation(() => {
        throw new Error(errorMessage);
      }),
      participants: [
        {
          id: participantId,
          name: 'Visitor',
          isCommercial: false,
          isVisitor: true,
        },
      ],
    };

    // Simula que el chat existe
    jest
      .spyOn(chatRepository, 'findOne')
      .mockResolvedValueOnce(Optional.of({ chat: chat as unknown as Chat }));

    // Ejecuta el comando y verifica que se lanza el error esperado
    await expect(commandHandler.execute(command)).rejects.toThrow(Error);
    
    // Verifica que no se llamó a save
    expect(chatRepository['save']).not.toHaveBeenCalled();
  });
});
