import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { RealTimeMessageSenderCommandHandler } from './real-time-message-sender.command-handler';
import { RealTimeMessageSenderCommand } from './real-time-message-sender.command';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { INotification, NOTIFICATION } from '../../../domain/notification';
import { ConnectionUser } from '../../../domain/connection-user';
import { err, ok, okVoid } from '../../../../shared/domain/result';
import {
  ConnectionUserNotFound,
  RealTimeMessageSenderError,
} from '../../../domain/errors/connection-user-not-found';
import { DomainError } from '../../../../shared/domain/domain.error';
import { ChatPrimitives } from '../../../../conversations/chat/domain/chat/chat';
import { FindOneChatByIdQuery } from '../../../../conversations/chat/application/read/find-one-chat-by-id.query';
import { SaveMessageCommand } from '../../../../conversations/chat/application/create/message/save-message.command';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

// Clase de error personalizada para las pruebas
class TestSaveError extends DomainError {
  constructor(message: string) {
    super(message);
  }

  equals(other: DomainError): boolean {
    return other instanceof TestSaveError && this.message === other.message;
  }

  getName(): string {
    return 'TestSaveError';
  }
}

describe('RealTimeMessageSenderCommandHandler', () => {
  let handler: RealTimeMessageSenderCommandHandler;
  let queryBus: jest.Mocked<QueryBus>;
  let commandBus: jest.Mocked<CommandBus>;
  let connectionRepository: jest.Mocked<ConnectionRepository>;
  let notification: jest.Mocked<INotification>;

  // Datos de prueba reutilizables
  const testData = {
    chatId: Uuid.generate(),
    senderId: Uuid.generate(),
    receiverId: Uuid.generate(),
    messageId: Uuid.generate(),
    message: 'Hello world!',
    createdAt: new Date('2024-01-01T12:00:00Z'),
  };

  const mockChat: ChatPrimitives = {
    id: testData.chatId,
    participants: [
      {
        id: testData.senderId,
        name: 'Sender User',
        isCommercial: true,
        isVisitor: false,
        isOnline: true,
        assignedAt: testData.createdAt,
        lastSeenAt: testData.createdAt,
        isViewing: false,
        isTyping: false,
      },
      {
        id: testData.receiverId,
        name: 'Receiver User',
        isCommercial: false,
        isVisitor: true,
        isOnline: true,
        assignedAt: testData.createdAt,
        lastSeenAt: testData.createdAt,
        isViewing: false,
        isTyping: false,
      },
    ],
    status: 'active',
    lastMessage: null,
    lastMessageAt: null,
    createdAt: testData.createdAt,
  };

  const mockSender = ConnectionUser.fromPrimitives({
    userId: testData.senderId,
    socketId: 'socket-1',
    roles: ['commercial'],
  });

  const mockReceiver = ConnectionUser.fromPrimitives({
    userId: testData.receiverId,
    socketId: 'socket-2',
    roles: ['visitor'],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealTimeMessageSenderCommandHandler,
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CONNECTION_REPOSITORY,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: NOTIFICATION,
          useValue: {
            notify: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<RealTimeMessageSenderCommandHandler>(
      RealTimeMessageSenderCommandHandler,
    );
    queryBus = module.get(QueryBus);
    commandBus = module.get(CommandBus);
    connectionRepository = module.get(CONNECTION_REPOSITORY);
    notification = module.get(NOTIFICATION);
  });

  describe('execute', () => {
    it('debe ejecutar exitosamente el envío de mensaje en tiempo real', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne
        .mockResolvedValueOnce(ok(mockSender))
        .mockResolvedValueOnce(ok(mockReceiver));

      commandBus.execute.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({}) as FindOneChatByIdQuery,
      );
      expect(connectionRepository.findOne).toHaveBeenCalledTimes(2);
      expect(notification.notify).toHaveBeenCalledWith({
        recipientId: testData.receiverId,
        type: 'receive-message',
        payload: {
          senderId: testData.senderId,
          message: testData.message,
          chatId: testData.chatId,
          id: testData.messageId,
          createdAt: testData.createdAt,
        },
      });
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({}) as SaveMessageCommand,
      );
    });

    it('debe retornar error cuando el chat no es encontrado', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      queryBus.execute.mockResolvedValue(
        err(new RealTimeMessageSenderError('Chat not found')),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RealTimeMessageSenderError);
        expect(result.error.message).toBe('Chat not found');
      }
      expect(connectionRepository.findOne).not.toHaveBeenCalled();
      expect(notification.notify).not.toHaveBeenCalled();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe retornar error cuando el remitente no es encontrado', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('User not found')),
      );

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RealTimeMessageSenderError);
        expect(result.error.message).toBe('Sender not found');
      }
      expect(notification.notify).not.toHaveBeenCalled();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe retornar error cuando el chat no tiene otros participantes', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      const chatWithoutOtherParticipants: ChatPrimitives = {
        ...mockChat,
        participants: [mockChat.participants[0]], // Solo el sender
      };

      queryBus.execute.mockResolvedValue(
        ok({ chat: chatWithoutOtherParticipants }),
      );

      connectionRepository.findOne.mockResolvedValue(ok(mockSender));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RealTimeMessageSenderError);
        expect(result.error.message).toContain('No receivers');
      }
      expect(notification.notify).not.toHaveBeenCalled();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('debe manejar correctamente usuarios desconectados', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      const disconnectedReceiver = ConnectionUser.fromPrimitives({
        userId: testData.receiverId,
        roles: ['visitor'],
      });

      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne
        .mockResolvedValueOnce(ok(mockSender))
        .mockResolvedValueOnce(ok(disconnectedReceiver));

      commandBus.execute.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(notification.notify).not.toHaveBeenCalled(); // No se notifica a usuarios desconectados
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(SaveMessageCommand),
      );
    });

    it('debe continuar cuando un receptor no se encuentra en ConnectionUser', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne
        .mockResolvedValueOnce(ok(mockSender)) // sender
        .mockResolvedValueOnce(
          err(new ConnectionUserNotFound('User not found')),
        ); // receiver no encontrado

      commandBus.execute.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(RealTimeMessageSenderError);
        expect(result.error.message).toContain('No receivers');
      }
    });

    it('debe enviar mensaje exitosamente a múltiples receptores conectados', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne
        .mockResolvedValueOnce(ok(mockSender))
        .mockResolvedValueOnce(ok(mockReceiver));

      commandBus.execute.mockResolvedValue(okVoid());

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(notification.notify).toHaveBeenCalledTimes(1);
      expect(notification.notify).toHaveBeenCalledWith({
        recipientId: testData.receiverId,
        type: 'receive-message',
        payload: {
          senderId: testData.senderId,
          message: testData.message,
          chatId: testData.chatId,
          id: testData.messageId,
          createdAt: testData.createdAt,
        },
      });
      expect(commandBus.execute).toHaveBeenCalled();
    });

    it('debe propagar errores del comando SaveMessage', async () => {
      // Arrange
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne
        .mockResolvedValueOnce(ok(mockSender))
        .mockResolvedValueOnce(ok(mockReceiver));

      const saveError = new TestSaveError('Database error');
      commandBus.execute.mockResolvedValue(err(saveError));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(TestSaveError);
      }
    });
  });

  describe('emitMessage (método privado)', () => {
    it('debe enviar notificaciones a usuarios conectados', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('User not found')),
      ); // Para que falle y no continúe

      // Act - Accedemos al método privado indirectamente a través de execute
      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      await handler.execute(command);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: testData.chatId,
        }),
      );
    });

    it('debe usar el repositorio de conexiones correctamente', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne.mockResolvedValue(ok(mockSender));

      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(connectionRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              field: 'userId',
              value: testData.senderId,
            }),
          ]),
        }),
      );
    });

    it('debe guardar el mensaje usando el command bus', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(ok({ chat: mockChat }));

      connectionRepository.findOne
        .mockResolvedValueOnce(ok(mockSender))
        .mockResolvedValueOnce(ok(mockReceiver));

      commandBus.execute.mockResolvedValue(okVoid());

      const command = new RealTimeMessageSenderCommand(
        testData.messageId,
        testData.chatId,
        testData.senderId,
        testData.message,
        testData.createdAt,
      );

      // Act
      await handler.execute(command);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(notification.notify).toHaveBeenCalledWith({
        recipientId: testData.receiverId,
        type: 'receive-message',
        payload: {
          senderId: testData.senderId,
          message: testData.message,
          chatId: testData.chatId,
          id: testData.messageId,
          createdAt: testData.createdAt,
        },
      });
    });
  });
});
