import { TypingStatus } from '../typing-status';

describe('TypingStatus', () => {
  describe('typing()', () => {
    it('should create typing status with isTyping true', () => {
      const status = TypingStatus.typing('user-123', 'chat-456');

      expect(status.getUserId()).toBe('user-123');
      expect(status.getChatId()).toBe('chat-456');
      expect(status.isTyping()).toBe(true);
      expect(status.getTimestamp()).toBeInstanceOf(Date);
    });
  });

  describe('notTyping()', () => {
    it('should create typing status with isTyping false', () => {
      const status = TypingStatus.notTyping('user-123', 'chat-456');

      expect(status.getUserId()).toBe('user-123');
      expect(status.getChatId()).toBe('chat-456');
      expect(status.isTyping()).toBe(false);
    });
  });

  describe('isExpired()', () => {
    it('should return false for recent typing status', () => {
      const status = TypingStatus.typing('user-123', 'chat-456');

      expect(status.isExpired(3)).toBe(false);
    });

    it('should return true for expired typing status', () => {
      // Crear status con timestamp antiguo
      const oldTimestamp = new Date(Date.now() - 5000); // 5 segundos atrás
      const status = TypingStatus.fromPrimitives({
        userId: 'user-123',
        chatId: 'chat-456',
        isTyping: true,
        timestamp: oldTimestamp,
      });

      expect(status.isExpired(3)).toBe(true);
    });
  });

  describe('toPrimitives()', () => {
    it('should convert to primitives correctly', () => {
      const status = TypingStatus.typing('user-123', 'chat-456');
      const primitives = status.toPrimitives();

      expect(primitives.userId).toBe('user-123');
      expect(primitives.chatId).toBe('chat-456');
      expect(primitives.isTyping).toBe(true);
      expect(primitives.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });
  });

  describe('fromPrimitives()', () => {
    it('should reconstruct from primitives', () => {
      const now = new Date();
      const status = TypingStatus.fromPrimitives({
        userId: 'user-123',
        chatId: 'chat-456',
        isTyping: true,
        timestamp: now.toISOString(),
      });

      expect(status.getUserId()).toBe('user-123');
      expect(status.getChatId()).toBe('chat-456');
      expect(status.isTyping()).toBe(true);
      expect(status.getTimestamp().getTime()).toBeCloseTo(now.getTime(), -2);
    });

    it('should handle Date objects in fromPrimitives', () => {
      const now = new Date();
      const status = TypingStatus.fromPrimitives({
        userId: 'user-123',
        chatId: 'chat-456',
        isTyping: false,
        timestamp: now,
      });

      expect(status.getTimestamp()).toEqual(now);
    });
  });
});
