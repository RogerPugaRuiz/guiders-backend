/* eslint-disable @typescript-eslint/unbound-method */
import { SaveMessageOnChatUpdatedWithNewMessageEventHandler } from './save-message-on-chat-updated-with-new-message-event.handler';
import { IMessageRepository } from '../../domain/message.repository';
import { ChatUpdatedWithNewMessageEvent } from 'src/context/chat-context/chat/domain/chat/events/chat-updated-with-new-message.event';
import { Message } from '../../domain/message';
import { okVoid } from 'src/context/shared/domain/result';
import { UUID } from 'src/context/shared/domain/value-objects/uuid';

// Mock para el repositorio de mensajes
const messageRepositoryMock: jest.Mocked<IMessageRepository> = {
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findPaginated: jest.fn(),
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
      id: UUID.generate(),
      chatId: UUID.generate(),
      senderId: UUID.generate(),
      content: 'Hola mundo',
      createdAt: new Date(),
    };
    const event = {
      params: { attributes: { message: messagePrimitives } },
    } as unknown as ChatUpdatedWithNewMessageEvent;
    const messageEntity = Message.fromPrimitives(messagePrimitives);
    messageRepositoryMock.save.mockResolvedValue(resultOk);

    // Act
    await handler.handle(event);

    // Assert
    expect(messageRepositoryMock.save).toHaveBeenCalledWith(messageEntity);
  });

  it('debe manejar errores del repositorio correctamente', async () => {
    // Arrange
    const messagePrimitives = {
      id: UUID.generate(),
      chatId: UUID.generate(),
      senderId: UUID.generate(),
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
      id: UUID.generate(),
      chatId: UUID.generate(),
      senderId: UUID.generate(),
      content: 'Mensaje de prueba',
      createdAt: new Date(),
    };
    const event = {
      params: { attributes: { message: messagePrimitives } },
    } as unknown as ChatUpdatedWithNewMessageEvent;
    const spy = jest.spyOn(Message, 'fromPrimitives');
    messageRepositoryMock.save.mockResolvedValue(resultOk);

    // Act
    await handler.handle(event);

    // Assert
    expect(spy).toHaveBeenCalledWith(messagePrimitives);
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
