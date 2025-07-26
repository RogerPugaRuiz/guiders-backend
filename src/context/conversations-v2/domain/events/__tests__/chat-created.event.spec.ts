import { ChatCreatedEvent, ChatCreatedData } from '../chat-created.event';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('ChatCreatedEvent', () => {
  describe('constructor', () => {
    it('debería crear un evento de chat creado con todos los parámetros', () => {
      // Arrange
      const chatData: ChatCreatedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        companyId: Uuid.random().value,
        status: 'PENDING',
        priority: 'NORMAL',
        visitorInfo: {
          name: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '+34123456789',
          company: 'Empresa SA',
          ipAddress: '192.168.1.1',
          location: {
            country: 'España',
            city: 'Madrid',
          },
          referrer: 'https://google.com',
          userAgent: 'Mozilla/5.0',
        },
        metadata: {
          department: 'Ventas',
          product: 'Producto A',
          source: 'website',
          tags: ['premium', 'enterprise'],
        },
        createdAt: new Date(),
      };

      // Act
      const event = new ChatCreatedEvent({ chat: chatData });

      // Assert
      expect(event.getChatId()).toBe(chatData.chatId);
      expect(event.getVisitorId()).toBe(chatData.visitorId);
      expect(event.getCompanyId()).toBe(chatData.companyId);
      expect(event.getChatData().status).toBe(chatData.status);
      expect(event.getChatData().priority).toBe(chatData.priority);
      expect(event.getChatData().visitorInfo.name).toBe(
        chatData.visitorInfo.name,
      );
      expect(event.getChatData().metadata?.department).toBe(
        chatData.metadata?.department,
      );
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('debería crear un evento con información mínima', () => {
      // Arrange
      const chatData: ChatCreatedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        companyId: Uuid.random().value,
        status: 'PENDING',
        priority: 'NORMAL',
        visitorInfo: {},
        createdAt: new Date(),
      };

      // Act
      const event = new ChatCreatedEvent({ chat: chatData });

      // Assert
      expect(event.getChatId()).toBe(chatData.chatId);
      expect(event.getVisitorId()).toBe(chatData.visitorId);
      expect(event.getCompanyId()).toBe(chatData.companyId);
      expect(event.getChatData().status).toBe(chatData.status);
      expect(event.getChatData().priority).toBe(chatData.priority);
      expect(event.getChatData().visitorInfo).toEqual({});
      expect(event.getChatData().metadata).toBeUndefined();
    });

    it('debería crear un evento con visitante y empresa', () => {
      // Arrange
      const chatData: ChatCreatedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        companyId: Uuid.random().value,
        status: 'ACTIVE',
        priority: 'HIGH',
        visitorInfo: {
          name: 'María García',
          email: 'maria@empresa.com',
          company: 'Tech Corp',
        },
        metadata: {
          source: 'mobile',
          tags: ['vip'],
        },
        createdAt: new Date(),
      };

      // Act
      const event = new ChatCreatedEvent({ chat: chatData });

      // Assert
      expect(event.getChatData().status).toBe('ACTIVE');
      expect(event.getChatData().priority).toBe('HIGH');
      expect(event.getChatData().visitorInfo.company).toBe('Tech Corp');
      expect(event.getChatData().metadata?.source).toBe('mobile');
    });
  });

  describe('eventName', () => {
    it('debería retornar el nombre correcto del evento', () => {
      // Act & Assert
      expect(ChatCreatedEvent.eventName).toBe('chat.v2.created');
    });
  });

  describe('getters', () => {
    it('debería obtener correctamente los datos del chat', () => {
      // Arrange
      const chatData: ChatCreatedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        companyId: Uuid.random().value,
        status: 'PENDING',
        priority: 'NORMAL',
        visitorInfo: {
          name: 'Test User',
          email: 'test@example.com',
        },
        metadata: {
          source: 'web',
        },
        createdAt: new Date(),
      };

      const event = new ChatCreatedEvent({ chat: chatData });

      // Act & Assert
      expect(event.getChatData()).toEqual(chatData);
      expect(event.getChatId()).toBe(chatData.chatId);
      expect(event.getVisitorId()).toBe(chatData.visitorId);
      expect(event.getCompanyId()).toBe(chatData.companyId);
    });

    it('debería manejar correctamente los datos opcionales', () => {
      // Arrange
      const chatData: ChatCreatedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        companyId: Uuid.random().value,
        status: 'PENDING',
        priority: 'NORMAL',
        visitorInfo: {},
        createdAt: new Date(),
      };

      const event = new ChatCreatedEvent({ chat: chatData });

      // Act & Assert
      expect(event.getChatData().visitorInfo.name).toBeUndefined();
      expect(event.getChatData().visitorInfo.email).toBeUndefined();
      expect(event.getChatData().metadata).toBeUndefined();
    });
  });
});
