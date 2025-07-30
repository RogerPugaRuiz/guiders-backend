import { ChatMetadata } from '../chat-metadata';

describe('ChatMetadata', () => {
  describe('constructor', () => {
    it('debería crear un ChatMetadata válido con metadata completa', () => {
      // Arrange
      const validMetadata = {
        tags: ['urgente', 'vip'],
        source: 'website',
        department: 'ventas',
        product: 'software',
      };

      // Act
      const chatMetadata = new ChatMetadata(validMetadata);

      // Assert
      expect(chatMetadata).toBeInstanceOf(ChatMetadata);
      expect(chatMetadata.value).toEqual(validMetadata);
    });

    it('debería crear un ChatMetadata válido con metadata mínima', () => {
      // Arrange
      const minimalMetadata = {
        source: 'chat-widget',
      };

      // Act
      const chatMetadata = new ChatMetadata(minimalMetadata);

      // Assert
      expect(chatMetadata).toBeInstanceOf(ChatMetadata);
      expect(chatMetadata.value).toEqual(minimalMetadata);
    });

    it('debería lanzar error con objeto null', () => {
      // Arrange
      const nullMetadata = null;

      // Act & Assert
      expect(() => new ChatMetadata(nullMetadata as any)).toThrow(
        'Los metadatos del chat deben ser un objeto válido',
      );
    });

    it('debería lanzar error con objeto undefined', () => {
      // Arrange
      const undefinedMetadata = undefined;

      // Act & Assert
      expect(() => new ChatMetadata(undefinedMetadata as any)).toThrow(
        'Los metadatos del chat deben ser un objeto válido',
      );
    });
  });

  describe('fromPrimitives', () => {
    it('debería crear ChatMetadata desde datos primitivos', () => {
      // Arrange
      const data = {
        tags: ['importante'],
        source: 'mobile-app',
      };

      // Act
      const chatMetadata = ChatMetadata.fromPrimitives(data);

      // Assert
      expect(chatMetadata).toBeInstanceOf(ChatMetadata);
      expect(chatMetadata.value).toEqual(data);
    });
  });

  describe('empty', () => {
    it('debería crear ChatMetadata vacío', () => {
      // Act
      const chatMetadata = ChatMetadata.empty();

      // Assert
      expect(chatMetadata).toBeInstanceOf(ChatMetadata);
      expect(chatMetadata.value).toEqual({});
    });
  });

  describe('getTags', () => {
    it('debería retornar las tags cuando existen', () => {
      // Arrange
      const tags = ['urgente', 'vip', 'soporte'];
      const chatMetadata = new ChatMetadata({
        tags,
        source: 'website',
      });

      // Act & Assert
      expect(chatMetadata.getTags()).toEqual(tags);
    });

    it('debería retornar array vacío cuando no hay tags', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({
        source: 'website',
      });

      // Act & Assert
      expect(chatMetadata.getTags()).toEqual([]);
    });
  });

  describe('getSource', () => {
    it('debería retornar la fuente cuando existe', () => {
      // Arrange
      const source = 'mobile-app';
      const chatMetadata = new ChatMetadata({
        source,
      });

      // Act & Assert
      expect(chatMetadata.getSource()).toBe(source);
    });

    it('debería retornar undefined cuando no hay fuente', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.getSource()).toBeUndefined();
    });
  });

  describe('getDepartment', () => {
    it('debería retornar el departamento cuando existe', () => {
      // Arrange
      const department = 'ventas';
      const chatMetadata = new ChatMetadata({
        department,
      });

      // Act & Assert
      expect(chatMetadata.getDepartment()).toBe(department);
    });

    it('debería retornar undefined cuando no hay departamento', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.getDepartment()).toBeUndefined();
    });
  });

  describe('getProduct', () => {
    it('debería retornar el producto cuando existe', () => {
      // Arrange
      const product = 'software-crm';
      const chatMetadata = new ChatMetadata({
        product,
      });

      // Act & Assert
      expect(chatMetadata.getProduct()).toBe(product);
    });

    it('debería retornar undefined cuando no hay producto', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.getProduct()).toBeUndefined();
    });
  });

  describe('getCampaign', () => {
    it('debería retornar la campaña cuando existe', () => {
      // Arrange
      const campaign = 'black-friday-2024';
      const chatMetadata = new ChatMetadata({
        campaign,
      });

      // Act & Assert
      expect(chatMetadata.getCampaign()).toBe(campaign);
    });

    it('debería retornar undefined cuando no hay campaña', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.getCampaign()).toBeUndefined();
    });
  });

  describe('getUtmInfo', () => {
    it('debería retornar información UTM cuando existe', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'spring-sale',
      });

      // Act
      const utmInfo = chatMetadata.getUtmInfo();

      // Assert
      expect(utmInfo).toEqual({
        source: 'google',
        medium: 'cpc',
        campaign: 'spring-sale',
      });
    });

    it('debería retornar objeto con campos undefined cuando no hay UTM', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act
      const utmInfo = chatMetadata.getUtmInfo();

      // Assert
      expect(utmInfo).toEqual({
        source: undefined,
        medium: undefined,
        campaign: undefined,
      });
    });
  });

  describe('getCustomField', () => {
    it('debería retornar el campo personalizado cuando existe', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({
        customFields: {
          priority: 'high',
          region: 'europe',
        },
      });

      // Act & Assert
      expect(chatMetadata.getCustomField('priority')).toBe('high');
      expect(chatMetadata.getCustomField('region')).toBe('europe');
    });

    it('debería retornar undefined cuando no hay custom fields', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.getCustomField('priority')).toBeUndefined();
    });
  });

  describe('hasTags', () => {
    it('debería retornar true cuando tiene tags', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({
        tags: ['urgente'],
      });

      // Act & Assert
      expect(chatMetadata.hasTags()).toBe(true);
    });

    it('debería retornar false cuando no tiene tags', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.hasTags()).toBe(false);
    });

    it('debería retornar false cuando el array de tags está vacío', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({
        tags: [],
      });

      // Act & Assert
      expect(chatMetadata.hasTags()).toBe(false);
    });
  });

  describe('hasUtmInfo', () => {
    it('debería retornar true cuando tiene información UTM', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({
        utmSource: 'google',
      });

      // Act & Assert
      expect(chatMetadata.hasUtmInfo()).toBe(true);
    });

    it('debería retornar false cuando no tiene información UTM', () => {
      // Arrange
      const chatMetadata = new ChatMetadata({});

      // Act & Assert
      expect(chatMetadata.hasUtmInfo()).toBe(false);
    });
  });

  describe('toPrimitives', () => {
    it('debería convertir a primitivos correctamente', () => {
      // Arrange
      const data = {
        tags: ['urgente', 'vip'],
        source: 'website',
        department: 'ventas',
        product: 'software',
      };
      const chatMetadata = new ChatMetadata(data);

      // Act
      const primitives = chatMetadata.toPrimitives();

      // Assert
      expect(primitives).toEqual(data);
      expect(primitives).not.toBe(data); // Debería ser una copia
    });
  });

  describe('equals', () => {
    it('debería retornar true para ChatMetadata con el mismo valor', () => {
      // Arrange
      const metadata1 = new ChatMetadata({
        tags: ['urgente'],
        source: 'website',
      });
      const metadata2 = new ChatMetadata({
        tags: ['urgente'],
        source: 'website',
      });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('debería retornar false para ChatMetadata con diferentes valores', () => {
      // Arrange
      const metadata1 = new ChatMetadata({
        tags: ['urgente'],
        source: 'website',
      });
      const metadata2 = new ChatMetadata({
        tags: ['normal'],
        source: 'website',
      });

      // Act & Assert
      expect(metadata1.equals(metadata2)).toBe(false);
    });
  });
});
