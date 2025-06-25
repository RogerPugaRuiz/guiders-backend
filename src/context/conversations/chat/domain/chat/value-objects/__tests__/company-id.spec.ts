import { CompanyId } from '../company-id';

describe('CompanyId', () => {
  describe('create', () => {
    it('should create CompanyId with valid string', () => {
      const validId = 'valid-company-id';
      const companyId = CompanyId.create(validId);
      
      expect(companyId).toBeInstanceOf(CompanyId);
      expect(companyId.getValue()).toBe(validId);
    });

    it('should throw error for empty string', () => {
      expect(() => {
        CompanyId.create('');
      }).toThrow('CompanyId debe ser un string no vacío');
    });

    it('should throw error for whitespace only string', () => {
      expect(() => {
        CompanyId.create('   ');
      }).toThrow('CompanyId debe ser un string no vacío');
    });

    it('should accept string with valid content after trimming', () => {
      const companyId = CompanyId.create('  valid-id  ');
      expect(companyId.getValue()).toBe('  valid-id  '); // Should preserve original value
    });
  });
});