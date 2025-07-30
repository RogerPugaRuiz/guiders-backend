import { ChatPriority, ChatPriorityEnum } from '../chat-priority';

describe('ChatPriority', () => {
  describe('constructor', () => {
    it('debería crear un ChatPriority válido con prioridad LOW', () => {
      // Arrange
      const validPriority = ChatPriorityEnum.LOW;

      // Act
      const chatPriority = new ChatPriority(validPriority);

      // Assert
      expect(chatPriority).toBeInstanceOf(ChatPriority);
      expect(chatPriority.value).toBe(validPriority);
    });

    it('debería crear un ChatPriority válido con prioridad MEDIUM', () => {
      // Arrange
      const validPriority = ChatPriorityEnum.MEDIUM;

      // Act
      const chatPriority = new ChatPriority(validPriority);

      // Assert
      expect(chatPriority).toBeInstanceOf(ChatPriority);
      expect(chatPriority.value).toBe(validPriority);
    });

    it('debería crear un ChatPriority válido con prioridad HIGH', () => {
      // Arrange
      const validPriority = ChatPriorityEnum.HIGH;

      // Act
      const chatPriority = new ChatPriority(validPriority);

      // Assert
      expect(chatPriority).toBeInstanceOf(ChatPriority);
      expect(chatPriority.value).toBe(validPriority);
    });

    it('debería crear un ChatPriority válido con prioridad URGENT', () => {
      // Arrange
      const validPriority = ChatPriorityEnum.URGENT;

      // Act
      const chatPriority = new ChatPriority(validPriority);

      // Assert
      expect(chatPriority).toBeInstanceOf(ChatPriority);
      expect(chatPriority.value).toBe(validPriority);
    });

    it('debería lanzar error con prioridad inválida', () => {
      // Arrange
      const invalidPriority = 'invalid-priority';

      // Act & Assert
      expect(() => new ChatPriority(invalidPriority)).toThrow(
        'La prioridad del chat debe ser uno de los valores válidos',
      );
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyPriority = '';

      // Act & Assert
      expect(() => new ChatPriority(emptyPriority)).toThrow(
        'La prioridad del chat debe ser uno de los valores válidos',
      );
    });
  });

  describe('getNumericValue', () => {
    it('debería retornar 1 para prioridad LOW', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.LOW);

      // Act & Assert
      expect(chatPriority.getNumericValue()).toBe(1);
    });

    it('debería retornar 2 para prioridad MEDIUM', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.MEDIUM);

      // Act & Assert
      expect(chatPriority.getNumericValue()).toBe(2);
    });

    it('debería retornar 3 para prioridad HIGH', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.HIGH);

      // Act & Assert
      expect(chatPriority.getNumericValue()).toBe(3);
    });

    it('debería retornar 4 para prioridad URGENT', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.URGENT);

      // Act & Assert
      expect(chatPriority.getNumericValue()).toBe(4);
    });
  });

  describe('isHigherThan', () => {
    it('debería retornar true cuando la prioridad es mayor', () => {
      // Arrange
      const highPriority = new ChatPriority(ChatPriorityEnum.HIGH);
      const mediumPriority = new ChatPriority(ChatPriorityEnum.MEDIUM);

      // Act & Assert
      expect(highPriority.isHigherThan(mediumPriority)).toBe(true);
    });

    it('debería retornar false cuando la prioridad es menor', () => {
      // Arrange
      const lowPriority = new ChatPriority(ChatPriorityEnum.LOW);
      const mediumPriority = new ChatPriority(ChatPriorityEnum.MEDIUM);

      // Act & Assert
      expect(lowPriority.isHigherThan(mediumPriority)).toBe(false);
    });

    it('debería retornar false cuando las prioridades son iguales', () => {
      // Arrange
      const priority1 = new ChatPriority(ChatPriorityEnum.MEDIUM);
      const priority2 = new ChatPriority(ChatPriorityEnum.MEDIUM);

      // Act & Assert
      expect(priority1.isHigherThan(priority2)).toBe(false);
    });

    it('debería retornar true para URGENT comparado con cualquier otra', () => {
      // Arrange
      const urgentPriority = new ChatPriority(ChatPriorityEnum.URGENT);
      const highPriority = new ChatPriority(ChatPriorityEnum.HIGH);

      // Act & Assert
      expect(urgentPriority.isHigherThan(highPriority)).toBe(true);
    });
  });

  describe('isUrgent', () => {
    it('debería retornar true para prioridad URGENT', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.URGENT);

      // Act & Assert
      expect(chatPriority.isUrgent()).toBe(true);
    });

    it('debería retornar false para prioridad HIGH', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.HIGH);

      // Act & Assert
      expect(chatPriority.isUrgent()).toBe(false);
    });

    it('debería retornar false para prioridad MEDIUM', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.MEDIUM);

      // Act & Assert
      expect(chatPriority.isUrgent()).toBe(false);
    });

    it('debería retornar false para prioridad LOW', () => {
      // Arrange
      const chatPriority = new ChatPriority(ChatPriorityEnum.LOW);

      // Act & Assert
      expect(chatPriority.isUrgent()).toBe(false);
    });
  });

  describe('equals', () => {
    it('debería retornar true para ChatPriority con el mismo valor', () => {
      // Arrange
      const priority1 = new ChatPriority(ChatPriorityEnum.HIGH);
      const priority2 = new ChatPriority(ChatPriorityEnum.HIGH);

      // Act & Assert
      expect(priority1.equals(priority2)).toBe(true);
    });

    it('debería retornar false para ChatPriority con diferentes valores', () => {
      // Arrange
      const priority1 = new ChatPriority(ChatPriorityEnum.HIGH);
      const priority2 = new ChatPriority(ChatPriorityEnum.LOW);

      // Act & Assert
      expect(priority1.equals(priority2)).toBe(false);
    });
  });

  describe('static constants', () => {
    it('debería tener constantes estáticas para todas las prioridades', () => {
      // Act & Assert
      expect(ChatPriority.LOW.value).toBe(ChatPriorityEnum.LOW);
      expect(ChatPriority.MEDIUM.value).toBe(ChatPriorityEnum.MEDIUM);
      expect(ChatPriority.HIGH.value).toBe(ChatPriorityEnum.HIGH);
      expect(ChatPriority.URGENT.value).toBe(ChatPriorityEnum.URGENT);
    });
  });
});
