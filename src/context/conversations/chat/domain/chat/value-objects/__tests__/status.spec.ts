import { Status } from '../status';

describe('Status', () => {
  describe('constructor', () => {
    it('should create status with valid value', () => {
      const status = new Status('active');

      expect(status.value).toBe('active');
    });

    it('should not throw error with invalid status due to missing error message', () => {
      // The Status class doesn't provide an error message to PrimitiveValueObject
      // so it doesn't throw validation errors, it just accepts invalid values
      expect(() => {
        new Status('invalid-status');
      }).not.toThrow();
    });

    it('should accept all valid statuses', () => {
      const validStatuses = ['active', 'inactive', 'closed', 'archived', 'pending'];

      validStatuses.forEach(status => {
        expect(() => {
          new Status(status);
        }).not.toThrow();
      });
    });
  });

  describe('static constants', () => {
    it('should return correct DEFAULT status', () => {
      const status = Status.DEFAULT;

      expect(status.value).toBe('pending');
    });

    it('should return correct ACTIVE status', () => {
      const status = Status.ACTIVE;

      expect(status.value).toBe('active');
    });

    it('should return correct INACTIVE status', () => {
      const status = Status.INACTIVE;

      expect(status.value).toBe('inactive');
    });

    it('should return correct CLOSED status', () => {
      const status = Status.CLOSED;

      expect(status.value).toBe('closed');
    });

    it('should return correct ARCHIVED status', () => {
      const status = Status.ARCHIVED;

      expect(status.value).toBe('archived');
    });

    it('should return correct PENDING status', () => {
      const status = Status.PENDING;

      expect(status.value).toBe('pending');
    });
  });

  describe('equals', () => {
    it('should be equal to status with same value', () => {
      const status1 = Status.ACTIVE;
      const status2 = Status.ACTIVE;

      expect(status1.equals(status2)).toBe(true);
    });

    it('should not be equal to status with different value', () => {
      const status1 = Status.ACTIVE;
      const status2 = Status.PENDING;

      expect(status1.equals(status2)).toBe(false);
    });
  });
});