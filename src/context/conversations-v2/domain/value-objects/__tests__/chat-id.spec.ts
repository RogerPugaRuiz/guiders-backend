import { ChatId } from '../chat-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('ChatId', () => {
  describe('create', () => {
    it('debería crear un ChatId válido con UUID válido', () => {
      // Arrange
      const validUuid = Uuid.random().value;

      // Act
      const chatId = ChatId.create(validUuid);

      // Assert
      expect(chatId).toBeInstanceOf(ChatId);
      expect(chatId.value).toBe(validUuid);
    });

    it('debería lanzar error con UUID inválido', () => {
      // Arrange
      const invalidUuid = 'invalid-uuid';

      // Act & Assert
      expect(() => ChatId.create(invalidUuid)).toThrow('Invalid Uuid format');
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyUuid = '';

      // Act & Assert
      expect(() => ChatId.create(emptyUuid)).toThrow('Invalid Uuid format');
    });
  });

  describe('generate', () => {
    it('debería generar un ChatId válido', () => {
      // Act
      const chatId = ChatId.generate();

      // Assert
      expect(chatId).toBeInstanceOf(ChatId);
      expect(chatId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('debería generar ChatIds únicos', () => {
      // Act
      const chatId1 = ChatId.generate();
      const chatId2 = ChatId.generate();

      // Assert
      expect(chatId1.value).not.toBe(chatId2.value);
    });
  });

  describe('equals', () => {
    it('debería retornar true para ChatIds con el mismo valor', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const chatId1 = ChatId.create(uuid);
      const chatId2 = ChatId.create(uuid);

      // Act & Assert
      expect(chatId1.equals(chatId2)).toBe(true);
    });

    it('debería retornar false para ChatIds con diferentes valores', () => {
      // Arrange
      const chatId1 = ChatId.generate();
      const chatId2 = ChatId.generate();

      // Act & Assert
      expect(chatId1.equals(chatId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debería retornar el valor del UUID como string', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const chatId = ChatId.create(uuid);

      // Act
      const result = chatId.toString();

      // Assert
      expect(result).toBe(uuid);
    });
  });
});
