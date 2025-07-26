import { CommercialId } from '../commercial-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('CommercialId', () => {
  describe('create', () => {
    it('debería crear un CommercialId válido con UUID válido', () => {
      // Arrange
      const validUuid = Uuid.random().value;

      // Act
      const commercialId = CommercialId.create(validUuid);

      // Assert
      expect(commercialId).toBeInstanceOf(CommercialId);
      expect(commercialId.value).toBe(validUuid);
    });

    it('debería lanzar error con UUID inválido', () => {
      // Arrange
      const invalidUuid = 'invalid-uuid';

      // Act & Assert
      expect(() => CommercialId.create(invalidUuid)).toThrow(
        'Commercial ID debe ser un UUID válido',
      );
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyUuid = '';

      // Act & Assert
      expect(() => CommercialId.create(emptyUuid)).toThrow(
        'Commercial ID debe ser un UUID válido',
      );
    });
  });

  describe('generate', () => {
    it('debería generar un CommercialId válido', () => {
      // Act
      const commercialId = CommercialId.generate();

      // Assert
      expect(commercialId).toBeInstanceOf(CommercialId);
      expect(commercialId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('debería generar CommercialIds únicos', () => {
      // Act
      const commercialId1 = CommercialId.generate();
      const commercialId2 = CommercialId.generate();

      // Assert
      expect(commercialId1.value).not.toBe(commercialId2.value);
    });
  });

  describe('equals', () => {
    it('debería retornar true para CommercialIds con el mismo valor', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const commercialId1 = CommercialId.create(uuid);
      const commercialId2 = CommercialId.create(uuid);

      // Act & Assert
      expect(commercialId1.equals(commercialId2)).toBe(true);
    });

    it('debería retornar false para CommercialIds con diferentes valores', () => {
      // Arrange
      const commercialId1 = CommercialId.generate();
      const commercialId2 = CommercialId.generate();

      // Act & Assert
      expect(commercialId1.equals(commercialId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debería retornar el valor del UUID como string', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const commercialId = CommercialId.create(uuid);

      // Act
      const result = commercialId.toString();

      // Assert
      expect(result).toBe(uuid);
    });
  });
});
