import { VisitorId } from '../visitor-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('VisitorId', () => {
  describe('create', () => {
    it('debería crear un VisitorId válido con UUID válido', () => {
      // Arrange
      const validUuid = Uuid.random().value;

      // Act
      const visitorId = VisitorId.create(validUuid);

      // Assert
      expect(visitorId).toBeInstanceOf(VisitorId);
      expect(visitorId.value).toBe(validUuid);
    });

    it('debería lanzar error con UUID inválido', () => {
      // Arrange
      const invalidUuid = 'invalid-uuid';

      // Act & Assert
      expect(() => VisitorId.create(invalidUuid)).toThrow(
        'Visitor ID debe ser un UUID válido',
      );
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyUuid = '';

      // Act & Assert
      expect(() => VisitorId.create(emptyUuid)).toThrow(
        'Visitor ID debe ser un UUID válido',
      );
    });
  });

  describe('generate', () => {
    it('debería generar un VisitorId válido', () => {
      // Act
      const visitorId = VisitorId.generate();

      // Assert
      expect(visitorId).toBeInstanceOf(VisitorId);
      expect(visitorId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('debería generar VisitorIds únicos', () => {
      // Act
      const visitorId1 = VisitorId.generate();
      const visitorId2 = VisitorId.generate();

      // Assert
      expect(visitorId1.value).not.toBe(visitorId2.value);
    });
  });

  describe('equals', () => {
    it('debería retornar true para VisitorIds con el mismo valor', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const visitorId1 = VisitorId.create(uuid);
      const visitorId2 = VisitorId.create(uuid);

      // Act & Assert
      expect(visitorId1.equals(visitorId2)).toBe(true);
    });

    it('debería retornar false para VisitorIds con diferentes valores', () => {
      // Arrange
      const visitorId1 = VisitorId.generate();
      const visitorId2 = VisitorId.generate();

      // Act & Assert
      expect(visitorId1.equals(visitorId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debería retornar el valor del UUID como string', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const visitorId = VisitorId.create(uuid);

      // Act
      const result = visitorId.toString();

      // Assert
      expect(result).toBe(uuid);
    });
  });
});
