import { MessageSentEvent, MessageSentData } from '../message-sent.event';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('MessageSentEvent', () => {
  describe('constructor', () => {
    it('debería crear un evento de mensaje enviado por comercial', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Hola, ¿cómo puedo ayudarte?',
        type: 'text',
        isFirstResponse: false,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.getMessageId()).toBe(messageData.messageId);
      expect(event.getChatId()).toBe(messageData.chatId);
      expect(event.getSenderId()).toBe(messageData.senderId);
      expect(event.getMessageData().content).toBe(messageData.content);
      expect(event.getMessageData().type).toBe(messageData.type);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('debería crear un evento de mensaje con adjunto', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Archivo adjunto',
        type: 'file',
        isFirstResponse: false,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
        attachment: {
          url: 'https://example.com/file.pdf',
          fileName: 'documento.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
        },
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.getMessageId()).toBe(messageData.messageId);
      expect(event.hasAttachment()).toBe(true);
      expect(event.getMessageData().attachment?.fileName).toBe('documento.pdf');
    });

    it('debería crear un evento de primera respuesta', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Primera respuesta del comercial',
        type: 'text',
        isFirstResponse: true,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.isFirstResponse()).toBe(true);
      expect(event.isInternal()).toBe(false);
    });

    it('debería crear un evento de mensaje interno', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Nota interna para el equipo',
        type: 'note',
        isFirstResponse: false,
        isInternal: true,
        isAI: false,
        sentAt: new Date(),
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.isInternal()).toBe(true);
      expect(event.isFirstResponse()).toBe(false);
    });

    it('debería crear un evento de mensaje de IA con metadata completa', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: 'ai',
        content: 'Hola, soy un asistente de IA',
        type: 'ai',
        isFirstResponse: false,
        isInternal: false,
        sentAt: new Date(),
        isAI: true,
        aiMetadata: {
          model: 'gpt-4',
          confidence: 0.95,
          suggestedActions: ['Ver productos', 'Contactar soporte'],
          processingTimeMs: 150,
          context: { topic: 'ventas' },
        },
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.isAIMessage()).toBe(true);
      expect(event.getAIMetadata()).toEqual(messageData.aiMetadata);
      expect(event.getAIMetadata()?.model).toBe('gpt-4');
      expect(event.getAIMetadata()?.confidence).toBe(0.95);
    });

    it('debería crear un evento de mensaje de IA sin metadata', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: 'ai',
        content: 'Respuesta automática',
        type: 'ai',
        isFirstResponse: false,
        isInternal: false,
        sentAt: new Date(),
        isAI: true,
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.isAIMessage()).toBe(true);
      expect(event.getAIMetadata()).toBeUndefined();
    });

    it('debería retornar false para isAIMessage en mensaje de texto', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Mensaje normal de texto',
        type: 'text',
        isFirstResponse: false,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
      };

      // Act
      const event = new MessageSentEvent({ message: messageData });

      // Assert
      expect(event.isAIMessage()).toBe(false);
      expect(event.getAIMetadata()).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('debería retornar el nombre correcto del evento', () => {
      // Act & Assert
      expect(MessageSentEvent.eventName).toBe('message.v2.sent');
    });
  });

  describe('getters', () => {
    it('debería obtener correctamente los datos del mensaje', () => {
      // Arrange
      const messageData: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Mensaje de prueba',
        type: 'text',
        isFirstResponse: true,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
      };

      const event = new MessageSentEvent({ message: messageData });

      // Act & Assert
      expect(event.getMessageData()).toEqual(messageData);
      expect(event.getMessageId()).toBe(messageData.messageId);
      expect(event.getChatId()).toBe(messageData.chatId);
      expect(event.getSenderId()).toBe(messageData.senderId);
      expect(event.isFirstResponse()).toBe(true);
      expect(event.isInternal()).toBe(false);
      expect(event.hasAttachment()).toBe(false);
    });

    it('debería verificar correctamente la presencia de adjuntos', () => {
      // Arrange
      const messageDataWithAttachment: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Mensaje con adjunto',
        type: 'file',
        isFirstResponse: false,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
        attachment: {
          url: 'https://example.com/image.jpg',
          fileName: 'imagen.jpg',
          fileSize: 512000,
          mimeType: 'image/jpeg',
        },
      };

      const messageDataWithoutAttachment: MessageSentData = {
        messageId: Uuid.random().value,
        chatId: Uuid.random().value,
        senderId: Uuid.random().value,
        content: 'Mensaje sin adjunto',
        type: 'text',
        isFirstResponse: false,
        isInternal: false,
        isAI: false,
        sentAt: new Date(),
      };

      // Act
      const eventWithAttachment = new MessageSentEvent({
        message: messageDataWithAttachment,
      });
      const eventWithoutAttachment = new MessageSentEvent({
        message: messageDataWithoutAttachment,
      });

      // Assert
      expect(eventWithAttachment.hasAttachment()).toBe(true);
      expect(eventWithoutAttachment.hasAttachment()).toBe(false);
    });
  });
});
