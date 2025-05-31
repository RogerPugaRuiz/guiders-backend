import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  VisitorPersistenceError,
  VisitorNotFoundError,
  VisitorDataError,
} from '../visitor.error';

describe('Visitor Errors', () => {
  describe('VisitorPersistenceError', () => {
    it('should create error with correct message', () => {
      const message = 'Test persistence error';
      const error = new VisitorPersistenceError(message);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(
        `Error de persistencia de visitante: ${message}`,
      );
    });

    it('should be throwable', () => {
      expect(() => {
        throw new VisitorPersistenceError('test');
      }).toThrow('Error de persistencia de visitante: test');
    });
  });

  describe('VisitorNotFoundError', () => {
    it('should create error with visitor ID in message', () => {
      const visitorId = 'visitor-123';
      const error = new VisitorNotFoundError(visitorId);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(`Visitante con ID ${visitorId} no encontrado`);
    });

    it('should be throwable', () => {
      expect(() => {
        throw new VisitorNotFoundError('test-id');
      }).toThrow('Visitante con ID test-id no encontrado');
    });
  });

  describe('VisitorDataError', () => {
    it('should create error with correct message', () => {
      const message = 'Invalid data format';
      const error = new VisitorDataError(message);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe(`Error en datos del visitante: ${message}`);
    });

    it('should be throwable', () => {
      expect(() => {
        throw new VisitorDataError('test');
      }).toThrow('Error en datos del visitante: test');
    });
  });
});
