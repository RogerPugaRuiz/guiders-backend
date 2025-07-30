import { ChatClosedEvent } from '../chat-closed.event';
import { ChatId } from '../../value-objects/chat-id';
import { CommercialId } from '../../value-objects/commercial-id';

describe('ChatClosedEvent', () => {
  const mockChatId = ChatId.generate();
  const mockCommercialId = CommercialId.generate();
  const mockVisitorId = 'visitor-123';

  describe('constructor', () => {
    it('debería crear un evento de chat cerrado por comercial', () => {
      // Arrange
      const closureData = {
        chatId: mockChatId.value,
        visitorId: mockVisitorId,
        commercialId: mockCommercialId.value,
        closedBy: mockCommercialId.value,
        reason: 'resolved',
        previousStatus: 'active',
        closedAt: new Date(),
        duration: 300,
        totalMessages: 15,
        firstResponseTime: 60,
      };

      // Act
      const event = new ChatClosedEvent({ closure: closureData });

      // Assert
      expect(event.getChatId()).toBe(mockChatId.value);
      expect(event.getVisitorId()).toBe(mockVisitorId);
      expect(event.getCommercialId()).toBe(mockCommercialId.value);
      expect(event.getReason()).toBe('resolved');
      expect(event.getDuration()).toBe(300);
      expect(event.wasClosedByCommercial()).toBe(true);
      expect(event.wasClosedByVisitor()).toBe(false);
      expect(event.hadFirstResponse()).toBe(true);
    });

    it('debería crear un evento de chat cerrado por visitante', () => {
      // Arrange
      const closureData = {
        chatId: mockChatId.value,
        visitorId: mockVisitorId,
        commercialId: mockCommercialId.value,
        closedBy: mockVisitorId,
        reason: 'abandoned',
        previousStatus: 'active',
        closedAt: new Date(),
        duration: 120,
        totalMessages: 5,
        firstResponseTime: 45,
      };

      // Act
      const event = new ChatClosedEvent({ closure: closureData });

      // Assert
      expect(event.getChatId()).toBe(mockChatId.value);
      expect(event.getVisitorId()).toBe(mockVisitorId);
      expect(event.getCommercialId()).toBe(mockCommercialId.value);
      expect(event.getReason()).toBe('abandoned');
      expect(event.getDuration()).toBe(120);
      expect(event.wasClosedByCommercial()).toBe(false);
      expect(event.wasClosedByVisitor()).toBe(true);
      expect(event.hadFirstResponse()).toBe(true);
    });

    it('debería crear un evento de chat cerrado sin comercial asignado', () => {
      // Arrange
      const closureData = {
        chatId: mockChatId.value,
        visitorId: mockVisitorId,
        closedBy: mockVisitorId,
        reason: 'timeout',
        previousStatus: 'pending',
        closedAt: new Date(),
        duration: 60,
        totalMessages: 1,
      };

      // Act
      const event = new ChatClosedEvent({ closure: closureData });

      // Assert
      expect(event.getChatId()).toBe(mockChatId.value);
      expect(event.getVisitorId()).toBe(mockVisitorId);
      expect(event.getCommercialId()).toBeUndefined();
      expect(event.getReason()).toBe('timeout');
      expect(event.getDuration()).toBe(60);
      expect(event.wasClosedByCommercial()).toBe(false);
      expect(event.wasClosedByVisitor()).toBe(true);
      expect(event.hadFirstResponse()).toBe(false);
    });
  });

  describe('getClosureData', () => {
    it('debería retornar los datos completos del cierre', () => {
      // Arrange
      const closureData = {
        chatId: mockChatId.value,
        visitorId: mockVisitorId,
        commercialId: mockCommercialId.value,
        closedBy: mockCommercialId.value,
        reason: 'resolved',
        previousStatus: 'active',
        closedAt: new Date(),
        duration: 300,
        totalMessages: 15,
        firstResponseTime: 60,
      };
      const event = new ChatClosedEvent({ closure: closureData });

      // Act
      const result = event.getClosureData();

      // Assert
      expect(result).toEqual(closureData);
    });
  });

  describe('eventName', () => {
    it('debería tener el nombre correcto del evento', () => {
      // Act & Assert
      expect(ChatClosedEvent.eventName).toBe('chat.v2.closed');
    });
  });
});
