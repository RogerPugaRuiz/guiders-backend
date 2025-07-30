import { MessageContent } from '../message-content';

describe('MessageContent', () => {
  describe('constructor', () => {
    it('debería crear un MessageContent válido con contenido normal', () => {
      // Arrange
      const validContent = 'Hola, ¿cómo puedo ayudarte?';

      // Act
      const messageContent = new MessageContent(validContent);

      // Assert
      expect(messageContent).toBeInstanceOf(MessageContent);
      expect(messageContent.value).toBe(validContent);
    });

    it('debería crear un MessageContent válido con emojis', () => {
      // Arrange
      const contentWithEmojis = 'Hola! 😊 ¿Cómo estás? 👋';

      // Act
      const messageContent = new MessageContent(contentWithEmojis);

      // Assert
      expect(messageContent).toBeInstanceOf(MessageContent);
      expect(messageContent.value).toBe(contentWithEmojis);
    });

    it('debería crear un MessageContent válido con URLs', () => {
      // Arrange
      const contentWithUrl =
        'Puedes visitar nuestro sitio: https://ejemplo.com';

      // Act
      const messageContent = new MessageContent(contentWithUrl);

      // Assert
      expect(messageContent).toBeInstanceOf(MessageContent);
      expect(messageContent.value).toBe(contentWithUrl);
    });

    it('debería crear un MessageContent válido con el máximo de caracteres', () => {
      // Arrange
      const maxContent = 'A'.repeat(4000);

      // Act
      const messageContent = new MessageContent(maxContent);

      // Assert
      expect(messageContent).toBeInstanceOf(MessageContent);
      expect(messageContent.value).toBe(maxContent);
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyContent = '';

      // Act & Assert
      expect(() => new MessageContent(emptyContent)).toThrow(
        'El contenido del mensaje debe ser válido',
      );
    });

    it('debería lanzar error con solo espacios en blanco', () => {
      // Arrange
      const whitespaceContent = '   \n\t   ';

      // Act & Assert
      expect(() => new MessageContent(whitespaceContent)).toThrow(
        'El contenido del mensaje debe ser válido',
      );
    });

    it('debería lanzar error con contenido muy largo', () => {
      // Arrange
      const tooLongContent = 'A'.repeat(4001);

      // Act & Assert
      expect(() => new MessageContent(tooLongContent)).toThrow(
        'El contenido del mensaje debe ser válido',
      );
    });
  });

  describe('getLength', () => {
    it('debería retornar la longitud correcta del contenido', () => {
      // Arrange
      const content = 'Hola mundo';
      const messageContent = new MessageContent(content);

      // Act
      const length = messageContent.getLength();

      // Assert
      expect(length).toBe(10);
    });

    it('debería retornar la longitud correcta para contenido con emojis', () => {
      // Arrange
      const content = 'Hola 😊';
      const messageContent = new MessageContent(content);

      // Act
      const length = messageContent.getLength();

      // Assert
      expect(length).toBe(7);
    });
  });

  describe('getTrimmedContent', () => {
    it('debería retornar el contenido sin espacios al inicio y final', () => {
      // Arrange
      const messageContent = new MessageContent('  Hola mundo  ');

      // Act
      const trimmed = messageContent.getTrimmedContent();

      // Assert
      expect(trimmed).toBe('Hola mundo');
    });
  });

  describe('isLongContent', () => {
    it('debería retornar true para contenido largo', () => {
      // Arrange
      const longContent = 'A'.repeat(501);
      const messageContent = new MessageContent(longContent);

      // Act & Assert
      expect(messageContent.isLongContent()).toBe(true);
    });

    it('debería retornar false para contenido corto', () => {
      // Arrange
      const shortContent = 'A'.repeat(499);
      const messageContent = new MessageContent(shortContent);

      // Act & Assert
      expect(messageContent.isLongContent()).toBe(false);
    });
  });

  describe('containsUrls', () => {
    it('debería retornar true para contenido con URL HTTP', () => {
      // Arrange
      const messageContent = new MessageContent('Visita http://ejemplo.com');

      // Act & Assert
      expect(messageContent.containsUrls()).toBe(true);
    });

    it('debería retornar true para contenido con URL HTTPS', () => {
      // Arrange
      const messageContent = new MessageContent('Visita https://ejemplo.com');

      // Act & Assert
      expect(messageContent.containsUrls()).toBe(true);
    });

    it('debería retornar true para contenido con múltiples URLs', () => {
      // Arrange
      const messageContent = new MessageContent(
        'Visita http://ejemplo1.com y https://ejemplo2.com',
      );

      // Act & Assert
      expect(messageContent.containsUrls()).toBe(true);
    });

    it('debería retornar false para contenido sin URLs', () => {
      // Arrange
      const messageContent = new MessageContent('Hola mundo sin enlaces');

      // Act & Assert
      expect(messageContent.containsUrls()).toBe(false);
    });

    it('debería retornar false para texto que parece URL pero no lo es', () => {
      // Arrange
      const messageContent = new MessageContent('archivo.txt y cosa.com');

      // Act & Assert
      expect(messageContent.containsUrls()).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('debería retornar el contenido completo si es corto', () => {
      // Arrange
      const shortContent = 'Mensaje corto';
      const messageContent = new MessageContent(shortContent);

      // Act
      const summary = messageContent.getSummary();

      // Assert
      expect(summary).toBe(shortContent);
    });

    it('debería retornar el contenido truncado con puntos suspensivos', () => {
      // Arrange
      const longContent = 'A'.repeat(200);
      const messageContent = new MessageContent(longContent);

      // Act
      const summary = messageContent.getSummary();

      // Assert
      expect(summary).toBe('A'.repeat(97) + '...');
      expect(summary.length).toBe(100);
    });
  });

  describe('extractUrls', () => {
    it('debería extraer URLs HTTP', () => {
      // Arrange
      const messageContent = new MessageContent('Visita http://ejemplo.com');

      // Act
      const urls = messageContent.extractUrls();

      // Assert
      expect(urls).toEqual(['http://ejemplo.com']);
    });

    it('debería extraer múltiples URLs', () => {
      // Arrange
      const messageContent = new MessageContent(
        'Visita http://ejemplo1.com y https://ejemplo2.com',
      );

      // Act
      const urls = messageContent.extractUrls();

      // Assert
      expect(urls).toEqual(['http://ejemplo1.com', 'https://ejemplo2.com']);
    });

    it('debería retornar array vacío si no hay URLs', () => {
      // Arrange
      const messageContent = new MessageContent('Mensaje sin URLs');

      // Act
      const urls = messageContent.extractUrls();

      // Assert
      expect(urls).toEqual([]);
    });
  });

  describe('equals', () => {
    it('debería retornar true para MessageContent con el mismo valor', () => {
      // Arrange
      const content = 'Mensaje de prueba';
      const messageContent1 = new MessageContent(content);
      const messageContent2 = new MessageContent(content);

      // Act & Assert
      expect(messageContent1.equals(messageContent2)).toBe(true);
    });

    it('debería retornar false para MessageContent con diferentes valores', () => {
      // Arrange
      const messageContent1 = new MessageContent('Mensaje 1');
      const messageContent2 = new MessageContent('Mensaje 2');

      // Act & Assert
      expect(messageContent1.equals(messageContent2)).toBe(false);
    });
  });
});
