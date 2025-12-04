import { MessageType, MessageTypeEnum } from '../message-type';

describe('MessageType', () => {
  describe('constructor', () => {
    it('debería crear un MessageType válido con tipo TEXT', () => {
      // Arrange
      const validType = MessageTypeEnum.TEXT;

      // Act
      const messageType = new MessageType(validType);

      // Assert
      expect(messageType).toBeInstanceOf(MessageType);
      expect(messageType.value).toBe(validType);
    });

    it('debería crear un MessageType válido con tipo FILE', () => {
      // Arrange
      const validType = MessageTypeEnum.FILE;

      // Act
      const messageType = new MessageType(validType);

      // Assert
      expect(messageType).toBeInstanceOf(MessageType);
      expect(messageType.value).toBe(validType);
    });

    it('debería crear un MessageType válido con tipo IMAGE', () => {
      // Arrange
      const validType = MessageTypeEnum.IMAGE;

      // Act
      const messageType = new MessageType(validType);

      // Assert
      expect(messageType).toBeInstanceOf(MessageType);
      expect(messageType.value).toBe(validType);
    });

    it('debería crear un MessageType válido con tipo SYSTEM', () => {
      // Arrange
      const validType = MessageTypeEnum.SYSTEM;

      // Act
      const messageType = new MessageType(validType);

      // Assert
      expect(messageType).toBeInstanceOf(MessageType);
      expect(messageType.value).toBe(validType);
    });

    it('debería crear un MessageType válido con tipo AI', () => {
      // Arrange
      const validType = MessageTypeEnum.AI;

      // Act
      const messageType = new MessageType(validType);

      // Assert
      expect(messageType).toBeInstanceOf(MessageType);
      expect(messageType.value).toBe(validType);
    });

    it('debería lanzar error con tipo inválido', () => {
      // Arrange
      const invalidType = 'invalid-type';

      // Act & Assert
      expect(() => new MessageType(invalidType)).toThrow(
        'El tipo de mensaje debe ser uno de los valores válidos',
      );
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyType = '';

      // Act & Assert
      expect(() => new MessageType(emptyType)).toThrow(
        'El tipo de mensaje debe ser uno de los valores válidos',
      );
    });
  });

  describe('isText', () => {
    it('debería retornar true para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.isText()).toBe(true);
    });

    it('debería retornar false para tipo FILE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.FILE);

      // Act & Assert
      expect(messageType.isText()).toBe(false);
    });

    it('debería retornar false para tipo IMAGE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.IMAGE);

      // Act & Assert
      expect(messageType.isText()).toBe(false);
    });

    it('debería retornar false para tipo SYSTEM', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.SYSTEM);

      // Act & Assert
      expect(messageType.isText()).toBe(false);
    });
  });

  describe('isFile', () => {
    it('debería retornar true para tipo FILE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.FILE);

      // Act & Assert
      expect(messageType.isFile()).toBe(true);
    });

    it('debería retornar false para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.isFile()).toBe(false);
    });
  });

  describe('isImage', () => {
    it('debería retornar true para tipo IMAGE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.IMAGE);

      // Act & Assert
      expect(messageType.isImage()).toBe(true);
    });

    it('debería retornar false para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.isImage()).toBe(false);
    });
  });

  describe('isSystem', () => {
    it('debería retornar true para tipo SYSTEM', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.SYSTEM);

      // Act & Assert
      expect(messageType.isSystem()).toBe(true);
    });

    it('debería retornar false para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.isSystem()).toBe(false);
    });
  });

  describe('isAI', () => {
    it('debería retornar true para tipo AI', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.AI);

      // Act & Assert
      expect(messageType.isAI()).toBe(true);
    });

    it('debería retornar false para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.isAI()).toBe(false);
    });

    it('debería retornar false para tipo SYSTEM', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.SYSTEM);

      // Act & Assert
      expect(messageType.isAI()).toBe(false);
    });
  });

  describe('requiresContent', () => {
    it('debería retornar true para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.requiresContent()).toBe(true);
    });

    it('debería retornar false para tipo FILE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.FILE);

      // Act & Assert
      expect(messageType.requiresContent()).toBe(false);
    });

    it('debería retornar false para tipo IMAGE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.IMAGE);

      // Act & Assert
      expect(messageType.requiresContent()).toBe(false);
    });

    it('debería retornar true para tipo SYSTEM', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.SYSTEM);

      // Act & Assert
      expect(messageType.requiresContent()).toBe(true);
    });

    it('debería retornar true para tipo AI', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.AI);

      // Act & Assert
      expect(messageType.requiresContent()).toBe(true);
    });
  });

  describe('canHaveAttachment', () => {
    it('debería retornar true para tipo FILE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.FILE);

      // Act & Assert
      expect(messageType.canHaveAttachment()).toBe(true);
    });

    it('debería retornar true para tipo IMAGE', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.IMAGE);

      // Act & Assert
      expect(messageType.canHaveAttachment()).toBe(true);
    });

    it('debería retornar false para tipo TEXT', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType.canHaveAttachment()).toBe(false);
    });

    it('debería retornar false para tipo SYSTEM', () => {
      // Arrange
      const messageType = new MessageType(MessageTypeEnum.SYSTEM);

      // Act & Assert
      expect(messageType.canHaveAttachment()).toBe(false);
    });
  });

  describe('equals', () => {
    it('debería retornar true para MessageType con el mismo valor', () => {
      // Arrange
      const messageType1 = new MessageType(MessageTypeEnum.TEXT);
      const messageType2 = new MessageType(MessageTypeEnum.TEXT);

      // Act & Assert
      expect(messageType1.equals(messageType2)).toBe(true);
    });

    it('debería retornar false para MessageType con diferentes valores', () => {
      // Arrange
      const messageType1 = new MessageType(MessageTypeEnum.TEXT);
      const messageType2 = new MessageType(MessageTypeEnum.FILE);

      // Act & Assert
      expect(messageType1.equals(messageType2)).toBe(false);
    });
  });

  describe('static constants', () => {
    it('debería tener constantes estáticas para todos los tipos', () => {
      // Act & Assert
      expect(MessageType.TEXT.value).toBe(MessageTypeEnum.TEXT);
      expect(MessageType.FILE.value).toBe(MessageTypeEnum.FILE);
      expect(MessageType.IMAGE.value).toBe(MessageTypeEnum.IMAGE);
      expect(MessageType.SYSTEM.value).toBe(MessageTypeEnum.SYSTEM);
      expect(MessageType.AI.value).toBe(MessageTypeEnum.AI);
    });
  });
});
