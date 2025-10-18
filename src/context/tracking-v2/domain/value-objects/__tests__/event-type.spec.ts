import { EventType, EventTypes } from '../event-type';

describe('EventType', () => {
  describe('constructor', () => {
    it('debería crear un EventType válido con string no vacío', () => {
      // Arrange
      const validType = 'PAGE_VIEW';

      // Act
      const eventType = new EventType(validType);

      // Assert
      expect(eventType).toBeInstanceOf(EventType);
      expect(eventType.value).toBe(validType);
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyType = '';

      // Act & Assert
      expect(() => new EventType(emptyType)).toThrow(
        'El tipo de evento no puede estar vacío',
      );
    });

    it('debería aceptar tipos personalizados', () => {
      // Arrange
      const customType = 'CUSTOM_EVENT_TYPE';

      // Act
      const eventType = new EventType(customType);

      // Assert
      expect(eventType.value).toBe(customType);
    });
  });

  describe('factory methods', () => {
    it('debería crear EventType para PAGE_VIEW', () => {
      // Act
      const eventType = EventType.pageView();

      // Assert
      expect(eventType.value).toBe(EventTypes.PAGE_VIEW);
    });

    it('debería crear EventType para CLICK', () => {
      // Act
      const eventType = EventType.click();

      // Assert
      expect(eventType.value).toBe(EventTypes.CLICK);
    });

    it('debería crear EventType para SCROLL', () => {
      // Act
      const eventType = EventType.scroll();

      // Assert
      expect(eventType.value).toBe(EventTypes.SCROLL);
    });
  });

  describe('isHighFrequency', () => {
    it('debería retornar true para MOUSE_MOVE', () => {
      // Arrange
      const eventType = EventType.mouseMove();

      // Act & Assert
      expect(eventType.isHighFrequency()).toBe(true);
    });

    it('debería retornar true para SCROLL', () => {
      // Arrange
      const eventType = EventType.scroll();

      // Act & Assert
      expect(eventType.isHighFrequency()).toBe(true);
    });

    it('debería retornar false para PAGE_VIEW', () => {
      // Arrange
      const eventType = EventType.pageView();

      // Act & Assert
      expect(eventType.isHighFrequency()).toBe(false);
    });
  });

  describe('isCritical', () => {
    it('debería retornar true para FORM_SUBMIT', () => {
      // Arrange
      const eventType = EventType.formSubmit();

      // Act & Assert
      expect(eventType.isCritical()).toBe(true);
    });

    it('debería retornar false para SCROLL', () => {
      // Arrange
      const eventType = EventType.scroll();

      // Act & Assert
      expect(eventType.isCritical()).toBe(false);
    });
  });

  describe('equals', () => {
    it('debería retornar true para EventTypes con el mismo valor', () => {
      // Arrange
      const eventType1 = EventType.pageView();
      const eventType2 = new EventType('PAGE_VIEW');

      // Act & Assert
      expect(eventType1.equals(eventType2)).toBe(true);
    });

    it('debería retornar false para EventTypes con diferentes valores', () => {
      // Arrange
      const eventType1 = EventType.pageView();
      const eventType2 = EventType.click();

      // Act & Assert
      expect(eventType1.equals(eventType2)).toBe(false);
    });
  });
});
