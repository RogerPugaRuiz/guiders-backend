import { ChatId } from '../chat-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('ChatId', () => {
  describe('create', () => {
    it('should create ChatId with valid UUID', () => {
      const uuid = Uuid.random().value;

      const chatId = ChatId.create(uuid);

      expect(chatId.value).toBe(uuid);
    });

    it('should throw error with invalid UUID format', () => {
      const invalidUuid = 'invalid-uuid';

      expect(() => {
        ChatId.create(invalidUuid);
      }).toThrow();
    });

    it('should be equal to another ChatId with same value', () => {
      const uuid = Uuid.random().value;
      const chatId1 = ChatId.create(uuid);
      const chatId2 = ChatId.create(uuid);

      expect(chatId1.equals(chatId2)).toBe(true);
    });

    it('should not be equal to ChatId with different value', () => {
      const chatId1 = ChatId.create(Uuid.random().value);
      const chatId2 = ChatId.create(Uuid.random().value);

      expect(chatId1.equals(chatId2)).toBe(false);
    });
  });
});
