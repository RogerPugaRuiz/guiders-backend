import { ChatViewOpenedEvent } from '../chat-view-opened.event';

describe('ChatViewOpenedEvent', () => {
  describe('constructor', () => {
    it('deberia crear un evento de vista abierta por visitante', () => {
      // Arrange
      const viewData = {
        chatId: 'chat-123',
        userId: 'visitor-456',
        userRole: 'visitor' as const,
        openedAt: new Date('2025-10-03T10:00:00Z'),
      };

      // Act
      const event = new ChatViewOpenedEvent({ view: viewData });

      // Assert
      expect(event.getChatId()).toBe('chat-123');
      expect(event.getUserId()).toBe('visitor-456');
      expect(event.getUserRole()).toBe('visitor');
      expect(event.isVisitor()).toBe(true);
      expect(event.isCommercial()).toBe(false);
      expect(event.getOpenedAt()).toEqual(new Date('2025-10-03T10:00:00Z'));
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('deberia crear un evento de vista abierta por comercial', () => {
      // Arrange
      const viewData = {
        chatId: 'chat-123',
        userId: 'commercial-789',
        userRole: 'commercial' as const,
        openedAt: new Date('2025-10-03T10:00:00Z'),
      };

      // Act
      const event = new ChatViewOpenedEvent({ view: viewData });

      // Assert
      expect(event.getChatId()).toBe('chat-123');
      expect(event.getUserId()).toBe('commercial-789');
      expect(event.getUserRole()).toBe('commercial');
      expect(event.isVisitor()).toBe(false);
      expect(event.isCommercial()).toBe(true);
    });
  });

  describe('eventName', () => {
    it('deberia retornar el nombre correcto del evento', () => {
      // Act & Assert
      expect(ChatViewOpenedEvent.eventName).toBe('chat.v2.view-opened');
    });
  });

  describe('getters', () => {
    it('deberia obtener correctamente los datos de la vista', () => {
      // Arrange
      const viewData = {
        chatId: 'chat-123',
        userId: 'visitor-456',
        userRole: 'visitor' as const,
        openedAt: new Date('2025-10-03T10:00:00Z'),
      };

      const event = new ChatViewOpenedEvent({ view: viewData });

      // Act & Assert
      expect(event.getViewData()).toEqual(viewData);
    });
  });
});
