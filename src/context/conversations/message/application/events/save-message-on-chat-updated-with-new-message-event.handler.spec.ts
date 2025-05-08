/* eslint-disable @typescript-eslint/unbound-method */
import { SaveMessageOnChatUpdatedWithNewMessageEventHandler } from './save-message-on-chat-updated-with-new-message-event.handler';
import { IMessageRepository } from '../../domain/message.repository';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/conversations/chat/domain/chat/events/chat-updated-with-new-message.event';
import { Message } from '../../domain/message';
import { okVoid } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { ChatId } from 'src/context/conversations/chat/domain/chat/value-objects/chat-id';
import { Content } from '../../domain/value-objects/content';
import { SenderId } from '../../domain/value-objects/sender-id';
import { CreatedAt } from '../../domain/value-objects/created-at';
import { MessageId } from '../../domain/value-objects/message-id';

// Mock para el repositorio de mensajes
const messageRepositoryMock: jest.Mocked<IMessageRepository> = {
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

// Utilidad para simular un Result<void, SaveMessageError>
// Se usa okVoid() para cumplir con la interfaz de Result
const resultOk = okVoid();

describe('SaveMessageOnChatUpdatedWithNewMessageEventHandler', () => {
  let handler: SaveMessageOnChatUpdatedWithNewMessageEventHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new SaveMessageOnChatUpdatedWithNewMessageEventHandler(
      messageRepositoryMock,
    );
  });

  it('debe guardar el mensaje recibido en el evento', async () => {
    // Arrange: datos de mensaje simulados
    const messagePrimitives = {
      id: Uuid.generate(),
      chatId: Uuid.generate(),
      senderId: Uuid.generate(),
      content: 'Hola mundo',
      createdAt: new Date(),
    };
    const event = {
      params: { attributes: { message: messagePrimitives } },
    } as unknown as ChatUpdatedWithNewMessageEvent;
    // Creamos la entidad Message igual que el handler (usando value objects, incluyendo el id)
    const messageEntity = Message.create({
      id: MessageId.create(messagePrimitives.id),
      chatId: ChatId.create(messagePrimitives.chatId),
      content: Content.create(messagePrimitives.content),
      senderId: SenderId.create(messagePrimitives.senderId),
      createdAt: CreatedAt.create(messagePrimitives.createdAt),
    });
    messageRepositoryMock.save.mockResolvedValue(resultOk);

    // Act
    await handler.handle(event);

    // Assert
    expect(messageRepositoryMock.save).toHaveBeenCalledWith(messageEntity);
  });

  it('debe manejar errores del repositorio correctamente', async () => {
    // Arrange
    const messagePrimitives = {
      id: Uuid.generate(),
      chatId: Uuid.generate(),
      senderId: Uuid.generate(),
      content: 'Mensaje de error',
      createdAt: new Date(),
    };
    const event = {
      params: { attributes: { message: messagePrimitives } },
    } as unknown as ChatUpdatedWithNewMessageEvent;
    messageRepositoryMock.save.mockRejectedValue(new Error('Repo error'));

    // Act & Assert
    await expect(handler.handle(event)).rejects.toThrow('Repo error');
  });

  it('debe crear la entidad Message correctamente', async () => {
    // Arrange
    const messagePrimitives = {
      id: Uuid.generate(),
      chatId: Uuid.generate(),
      senderId: Uuid.generate(),
      content: 'Mensaje de prueba',
      createdAt: new Date(),
    };
    const event = {
      params: { attributes: { message: messagePrimitives } },
    } as unknown as ChatUpdatedWithNewMessageEvent;
    // Espiamos Message.create en vez de fromPrimitives
    const spy = jest.spyOn(Message, 'create');
    messageRepositoryMock.save.mockResolvedValue(resultOk);

    // Act
    await handler.handle(event);

    // Assert
    expect(spy).toHaveBeenCalledWith({
      id: MessageId.create(messagePrimitives.id),
      chatId: ChatId.create(messagePrimitives.chatId),
      content: Content.create(messagePrimitives.content),
      senderId: SenderId.create(messagePrimitives.senderId),
      createdAt: CreatedAt.create(messagePrimitives.createdAt),
    });
  });

  it('no debe hacer nada inesperado si el evento no tiene message', async () => {
    // Arrange
    const event = {
      params: { attributes: {} },
    } as unknown as ChatUpdatedWithNewMessageEvent;

    // Act & Assert
    await expect(handler.handle(event)).rejects.toThrow();
    expect(messageRepositoryMock.save).not.toHaveBeenCalled();
  });
});
