import { VisitorInfo } from '../visitor-info';

describe('VisitorInfo', () => {
  describe('constructor', () => {
    it('debería crear un VisitorInfo válido con información completa', () => {
      // Arrange
      const validInfo = {
        name: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        phone: '+34123456789',
        ipAddress: '192.168.1.1',
      };

      // Act
      const visitorInfo = new VisitorInfo(validInfo);

      // Assert
      expect(visitorInfo).toBeInstanceOf(VisitorInfo);
      expect(visitorInfo.value).toEqual(validInfo);
    });

    it('debería crear un VisitorInfo válido con información mínima', () => {
      // Arrange
      const minimalInfo = {
        name: 'Visitante Anónimo',
      };

      // Act
      const visitorInfo = new VisitorInfo(minimalInfo);

      // Assert
      expect(visitorInfo).toBeInstanceOf(VisitorInfo);
      expect(visitorInfo.value).toEqual(minimalInfo);
    });

    it('debería lanzar error con objeto null', () => {
      // Arrange
      const nullInfo = null;

      // Act & Assert
      expect(() => new VisitorInfo(nullInfo as any)).toThrow(
        'La información del visitante debe ser un objeto válido',
      );
    });

    it('debería lanzar error con objeto undefined', () => {
      // Arrange
      const undefinedInfo = undefined;

      // Act & Assert
      expect(() => new VisitorInfo(undefinedInfo as any)).toThrow(
        'La información del visitante debe ser un objeto válido',
      );
    });
  });

  describe('fromPrimitives', () => {
    it('debería crear VisitorInfo desde datos primitivos', () => {
      // Arrange
      const data = {
        name: 'Juan Pérez',
        email: 'juan@ejemplo.com',
      };

      // Act
      const visitorInfo = VisitorInfo.fromPrimitives(data);

      // Assert
      expect(visitorInfo).toBeInstanceOf(VisitorInfo);
      expect(visitorInfo.value).toEqual(data);
    });
  });

  describe('getName', () => {
    it('debería retornar el nombre cuando existe', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        name: 'Juan Pérez',
      });

      // Act & Assert
      expect(visitorInfo.getName()).toBe('Juan Pérez');
    });

    it('debería retornar undefined cuando no hay nombre', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({});

      // Act & Assert
      expect(visitorInfo.getName()).toBeUndefined();
    });
  });

  describe('getEmail', () => {
    it('debería retornar el email cuando existe', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        email: 'juan@ejemplo.com',
      });

      // Act & Assert
      expect(visitorInfo.getEmail()).toBe('juan@ejemplo.com');
    });

    it('debería retornar undefined cuando no hay email', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({});

      // Act & Assert
      expect(visitorInfo.getEmail()).toBeUndefined();
    });
  });

  describe('getPhone', () => {
    it('debería retornar el teléfono cuando existe', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        phone: '+34123456789',
      });

      // Act & Assert
      expect(visitorInfo.getPhone()).toBe('+34123456789');
    });

    it('debería retornar undefined cuando no hay teléfono', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({});

      // Act & Assert
      expect(visitorInfo.getPhone()).toBeUndefined();
    });
  });

  describe('getCompany', () => {
    it('debería retornar la empresa cuando existe', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        company: 'Empresa S.A.',
      });

      // Act & Assert
      expect(visitorInfo.getCompany()).toBe('Empresa S.A.');
    });

    it('debería retornar undefined cuando no hay empresa', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({});

      // Act & Assert
      expect(visitorInfo.getCompany()).toBeUndefined();
    });
  });

  describe('getIpAddress', () => {
    it('debería retornar la IP cuando existe', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        ipAddress: '192.168.1.1',
      });

      // Act & Assert
      expect(visitorInfo.getIpAddress()).toBe('192.168.1.1');
    });

    it('debería retornar undefined cuando no hay IP', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({});

      // Act & Assert
      expect(visitorInfo.getIpAddress()).toBeUndefined();
    });
  });

  describe('getLocation', () => {
    it('debería retornar la ubicación cuando existe', () => {
      // Arrange
      const location = { country: 'España', city: 'Madrid' };
      const visitorInfo = new VisitorInfo({
        location,
      });

      // Act & Assert
      expect(visitorInfo.getLocation()).toEqual(location);
    });

    it('debería retornar undefined cuando no hay ubicación', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({});

      // Act & Assert
      expect(visitorInfo.getLocation()).toBeUndefined();
    });
  });

  describe('hasContactInfo', () => {
    it('debería retornar true cuando tiene email', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        email: 'juan@ejemplo.com',
      });

      // Act & Assert
      expect(visitorInfo.hasContactInfo()).toBe(true);
    });

    it('debería retornar true cuando tiene teléfono', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        phone: '+34123456789',
      });

      // Act & Assert
      expect(visitorInfo.hasContactInfo()).toBe(true);
    });

    it('debería retornar true cuando tiene ambos', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        email: 'juan@ejemplo.com',
        phone: '+34123456789',
      });

      // Act & Assert
      expect(visitorInfo.hasContactInfo()).toBe(true);
    });

    it('debería retornar false cuando no tiene información de contacto', () => {
      // Arrange
      const visitorInfo = new VisitorInfo({
        name: 'Juan',
      });

      // Act & Assert
      expect(visitorInfo.hasContactInfo()).toBe(false);
    });
  });

  describe('toPrimitives', () => {
    it('debería convertir a primitivos correctamente', () => {
      // Arrange
      const data = {
        name: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        phone: '+34123456789',
      };
      const visitorInfo = new VisitorInfo(data);

      // Act
      const primitives = visitorInfo.toPrimitives();

      // Assert
      expect(primitives).toEqual(data);
      expect(primitives).not.toBe(data); // Debería ser una copia
    });
  });

  describe('equals', () => {
    it('debería retornar true para VisitorInfo con el mismo valor', () => {
      // Arrange
      const info1 = new VisitorInfo({
        name: 'Juan',
        email: 'juan@ejemplo.com',
      });
      const info2 = new VisitorInfo({
        name: 'Juan',
        email: 'juan@ejemplo.com',
      });

      // Act & Assert
      expect(info1.equals(info2)).toBe(true);
    });

    it('debería retornar false para VisitorInfo con diferentes valores', () => {
      // Arrange
      const info1 = new VisitorInfo({
        name: 'Juan',
      });
      const info2 = new VisitorInfo({
        name: 'Pedro',
      });

      // Act & Assert
      expect(info1.equals(info2)).toBe(false);
    });
  });
});
