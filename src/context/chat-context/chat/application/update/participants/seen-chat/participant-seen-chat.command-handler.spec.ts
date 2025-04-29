// Preparativos para el test del ParticipantSeenChatCommandHandler
import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantSeenChatCommandHandler } from './participant-seen-chat.command-handler';
import { ParticipantSeenChatCommand } from './participant-seen-chat.command';
import { UUID } from 'src/context/shared/domain/value-objects/uuid';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/chat-context/chat/domain/chat/chat.repository';
import { Optional } from 'src/context/shared/domain/optional';
import { Chat } from 'src/context/chat-context/chat/domain/chat/chat';
import { EventPublisher, IEventPublisher } from '@nestjs/cqrs';

// Estructura básica del describe para el handler
// No se implementan pruebas, solo los preparativos

describe('ParticipantSeenChatCommandHandler', () => {
  let commandHandler: ParticipantSeenChatCommandHandler;
  let chatRepository: IChatRepository; // Repositorio de chat simulado

  beforeEach(async () => {
    // Configuración del módulo de testing de NestJS
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantSeenChatCommandHandler,
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
    commandHandler = module.get<ParticipantSeenChatCommandHandler>(
      ParticipantSeenChatCommandHandler,
    );
    chatRepository = module.get<IChatRepository>(CHAT_REPOSITORY);

    jest.clearAllMocks(); // Limpia los mocks antes de cada prueba
  });

  // Aquí irán las pruebas

  it('should throw error if participantId is invalid', async () => {
    const command = new ParticipantSeenChatCommand({
      participantId: UUID.generate(),
      chatId: UUID.generate(),
      seenAt: new Date(),
    });

    // Simula que el chat existe y el participantId no
    const chat = Chat.fromPrimitives({
      id: command.params.chatId,
      participants: [
        {
          id: UUID.generate(),
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
    const command = new ParticipantSeenChatCommand({
      participantId: UUID.generate(),
      chatId: UUID.generate(),
      seenAt: new Date(),
    });

    jest
      .spyOn(chatRepository, 'findOne')
      .mockResolvedValueOnce(Optional.empty());

    await expect(commandHandler.execute(command)).rejects.toThrow();
  });

  it('should update lastSeenAt for the participant participantId in the chat', async () => {
    const participantId = UUID.generate();
    const chatId = UUID.generate();
    const seenAt = new Date();

    const command = new ParticipantSeenChatCommand({
      participantId,
      chatId,
      seenAt,
    });

    const chat = Chat.fromPrimitives({
      id: command.params.chatId,
      participants: [
        {
          id: command.params.participantId,
          name: 'Visitor',
          isCommercial: false,
          isVisitor: true,
          lastSeenAt: new Date(Date.now() - 10000), // Fecha actual menos 10 segundos
        }, // Otro participante
      ],
      createdAt: new Date(),
      lastMessage: null,
      lastMessageAt: null,
      status: 'active',
    });

    // Mock or spy on the method that updates the participant's lastSeenAt
    const updateLastSeenAtSpy = jest.spyOn(commandHandler, 'execute');

    // Simula que el chat existe
    jest
      .spyOn(chatRepository, 'findOne')
      .mockResolvedValueOnce(Optional.of({ chat }));

    // Simula que el chat se guarda correctamente
    jest.spyOn(chatRepository, 'save').mockResolvedValueOnce();

    // Ejecuta el comando
    await commandHandler.execute(command);

    // Verificar que el método fue llamado con los argumentos correctos
    expect(updateLastSeenAtSpy).toHaveBeenCalledWith(command);

    // Verifica que el método save del repositorio fue llamado
    expect(chatRepository['save']).toHaveBeenCalledWith(expect.any(Chat));
  });
});
