import { EventMetadata } from '../event-metadata';

describe('EventMetadata', () => {
  describe('constructor', () => {
    it('debería crear EventMetadata con objeto válido', () => {
      // Arrange
      const validMetadata = { url: '/home', title: 'Home Page' };

      // Act
      const metadata = new EventMetadata(validMetadata);

      // Assert
      expect(metadata).toBeInstanceOf(EventMetadata);
      expect(metadata.value).toEqual(validMetadata);
    });

    it('debería crear EventMetadata con objeto vacío', () => {
      // Arrange
      const emptyMetadata = {};

      // Act
      const metadata = new EventMetadata(emptyMetadata);

      // Assert
      expect(metadata.value).toEqual({});
    });

    it('debería crear EventMetadata con objeto complejo', () => {
      // Arrange
      const complexMetadata = {
        url: '/products/laptop',
        product: {
          id: '123',
          name: 'Laptop Pro',
          price: 999.99,
        },
        tags: ['electronics', 'computers'],
      };

      // Act
      const metadata = new EventMetadata(complexMetadata);

      // Assert
      expect(metadata.value).toEqual(complexMetadata);
    });
  });

  describe('empty', () => {
    it('debería crear EventMetadata vacío', () => {
      // Act
      const metadata = EventMetadata.empty();

      // Assert
      expect(metadata.value).toEqual({});
    });
  });

  describe('get', () => {
    it('debería obtener un valor específico de los metadatos', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home', title: 'Home' });

      // Act
      const url = metadata.get('url');

      // Assert
      expect(url).toBe('/home');
    });

    it('debería retornar undefined para clave inexistente', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home' });

      // Act
      const result = metadata.get('nonexistent');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('debería retornar true si existe la clave', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home' });

      // Act & Assert
      expect(metadata.has('url')).toBe(true);
    });

    it('debería retornar false si no existe la clave', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home' });

      // Act & Assert
      expect(metadata.has('nonexistent')).toBe(false);
    });
  });

  describe('keys', () => {
    it('debería retornar todas las claves', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home', title: 'Home' });

      // Act
      const keys = metadata.keys();

      // Assert
      expect(keys).toEqual(['url', 'title']);
    });

    it('debería retornar array vacío para metadata vacío', () => {
      // Arrange
      const metadata = EventMetadata.empty();

      // Act
      const keys = metadata.keys();

      // Assert
      expect(keys).toEqual([]);
    });
  });

  describe('equals', () => {
    it('debería retornar true para metadata con mismo contenido', () => {
      // Arrange
      const metadata1 = new EventMetadata({ url: '/home', title: 'Home' });
      const metadata2 = new EventMetadata({ url: '/home', title: 'Home' });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('debería retornar true independientemente del orden de las claves', () => {
      // Arrange
      const metadata1 = new EventMetadata({ url: '/home', title: 'Home' });
      const metadata2 = new EventMetadata({ title: 'Home', url: '/home' });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('debería retornar false para metadata con diferente contenido', () => {
      // Arrange
      const metadata1 = new EventMetadata({ url: '/home' });
      const metadata2 = new EventMetadata({ url: '/about' });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(false);
    });

    it('debería retornar false para metadata con diferentes claves', () => {
      // Arrange
      const metadata1 = new EventMetadata({ url: '/home' });
      const metadata2 = new EventMetadata({ title: 'Home' });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });

  describe('merge', () => {
    it('debería combinar dos metadata correctamente', () => {
      // Arrange
      const metadata1 = new EventMetadata({ url: '/home' });
      const metadata2 = new EventMetadata({ title: 'Home' });

      // Act
      const merged = metadata1.merge(metadata2);

      // Assert
      expect(merged.value).toEqual({ url: '/home', title: 'Home' });
    });

    it('debería sobrescribir valores con el segundo metadata', () => {
      // Arrange
      const metadata1 = new EventMetadata({ url: '/home', title: 'Home' });
      const metadata2 = new EventMetadata({ title: 'Updated Home' });

      // Act
      const merged = metadata1.merge(metadata2);

      // Assert
      expect(merged.get('title')).toBe('Updated Home');
    });
  });

  describe('approximateSize', () => {
    it('debería retornar un tamaño aproximado en bytes', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home', title: 'Home' });

      // Act
      const size = metadata.approximateSize();

      // Assert
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('debería retornar 2 para metadata vacío ({})', () => {
      // Arrange
      const metadata = EventMetadata.empty();

      // Act
      const size = metadata.approximateSize();

      // Assert
      expect(size).toBe(2); // "{}"
    });
  });
});
