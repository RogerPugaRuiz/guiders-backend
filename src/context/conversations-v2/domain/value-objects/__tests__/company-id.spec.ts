import { CompanyId } from '../company-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('CompanyId', () => {
  describe('create', () => {
    it('debería crear un CompanyId válido con UUID válido', () => {
      // Arrange
      const validUuid = Uuid.random().value;

      // Act
      const companyId = CompanyId.create(validUuid);

      // Assert
      expect(companyId).toBeInstanceOf(CompanyId);
      expect(companyId.value).toBe(validUuid);
    });

    it('debería lanzar error con UUID inválido', () => {
      // Arrange
      const invalidUuid = 'invalid-uuid';

      // Act & Assert
      expect(() => CompanyId.create(invalidUuid)).toThrow('Invalid Uuid format');
    });

    it('debería lanzar error con string vacío', () => {
      // Arrange
      const emptyUuid = '';

      // Act & Assert
      expect(() => CompanyId.create(emptyUuid)).toThrow('Invalid Uuid format');
    });
  });

  describe('generate', () => {
    it('debería generar un CompanyId válido', () => {
      // Act
      const companyId = CompanyId.generate();

      // Assert
      expect(companyId).toBeInstanceOf(CompanyId);
      expect(companyId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('debería generar CompanyIds únicos', () => {
      // Act
      const companyId1 = CompanyId.generate();
      const companyId2 = CompanyId.generate();

      // Assert
      expect(companyId1.value).not.toBe(companyId2.value);
    });
  });

  describe('equals', () => {
    it('debería retornar true para CompanyIds con el mismo valor', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const companyId1 = CompanyId.create(uuid);
      const companyId2 = CompanyId.create(uuid);

      // Act & Assert
      expect(companyId1.equals(companyId2)).toBe(true);
    });

    it('debería retornar false para CompanyIds con diferentes valores', () => {
      // Arrange
      const companyId1 = CompanyId.generate();
      const companyId2 = CompanyId.generate();

      // Act & Assert
      expect(companyId1.equals(companyId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debería retornar el valor del UUID como string', () => {
      // Arrange
      const uuid = Uuid.random().value;
      const companyId = CompanyId.create(uuid);

      // Act
      const result = companyId.toString();

      // Assert
      expect(result).toBe(uuid);
    });
  });
});
