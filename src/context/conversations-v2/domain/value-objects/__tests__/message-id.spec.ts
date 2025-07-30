import { MessageId } from '../message-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('MessageId', () => {
  describe('create', () => {
    it('debería crear un MessageId válido con UUID válido', () => {
      // Arrange
      const validUuid = Uuid.random().value;

      // Act
      const messageId = MessageId.create(validUuid);

      // Assert
      expect(messageId).toBeInstanceOf(MessageId);
      expect(messageId.value).toBe(validUuid);
    });

    it('debería lanzar error con UUID inválido', () => {
      // Arrange
      const invalidUuid = 'invalid-uuid';

      // Act & Assert
      expect(() => MessageId.create(invalidUuid)).toThrow(
        'Message ID debe ser un UUID válido',
      );
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyUuid = '';

      // Act & Assert
      expect(() => MessageId.create(emptyUuid)).toThrow(
        'Message ID debe ser un UUID válido',
      );
    });
  });

  describe('generate', () => {
    it('debería generar un MessageId válido', () => {
      // Act
      const messageId = MessageId.generate();

      // Assert
      expect(messageId).toBeInstanceOf(MessageId);
      expect(messageId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('debería generar MessageIds únicos', () => {
      // Act
      const messageId1 = MessageId.generate();
      const messageId2 = MessageId.generate();

      // Assert
      expect(messageId1.value).not.toBe(messageId2.value);
    });
  });

  describe('equals', () => {
    it('debería retornar true para MessageIds con el mismo valor', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const messageId1 = MessageId.create(uuid);
      const messageId2 = MessageId.create(uuid);

      // Act & Assert
      expect(messageId1.equals(messageId2)).toBe(true);
    });

    it('debería retornar false para MessageIds con diferentes valores', () => {
      // Arrange
      const messageId1 = MessageId.generate();
      const messageId2 = MessageId.generate();

      // Act & Assert
      expect(messageId1.equals(messageId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debería retornar el valor del UUID como string', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const messageId = MessageId.create(uuid);

      // Act
      const result = messageId.toString();

      // Assert
      expect(result).toBe(uuid);
    });
  });
});
