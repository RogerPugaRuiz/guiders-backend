import { LastMessageAt } from '../last-message-at';

describe('LastMessageAt', () => {
  describe('constructor', () => {
    it('should create LastMessageAt with valid date', () => {
      const date = new Date();

      const lastMessageAt = new LastMessageAt(date);

      expect(lastMessageAt.value).toBe(date);
    });

    it('should throw error with invalid date', () => {
      const invalidDate = new Date('invalid');

      expect(() => {
        new LastMessageAt(invalidDate);
      }).toThrow('Invalid Last Message At');
    });

    it('should throw error with non-Date value', () => {
      expect(() => {
        new LastMessageAt('not-a-date' as unknown as Date);
      }).toThrow('Invalid Last Message At');
    });

    it('should accept past dates', () => {
      const pastDate = new Date('2023-01-01');

      const lastMessageAt = new LastMessageAt(pastDate);

      expect(lastMessageAt.value).toBe(pastDate);
    });

    it('should accept future dates', () => {
      const futureDate = new Date('2030-01-01');

      const lastMessageAt = new LastMessageAt(futureDate);

      expect(lastMessageAt.value).toBe(futureDate);
    });
  });

  describe('equals', () => {
    it('should be equal to LastMessageAt with same date', () => {
      const date = new Date();
      const lastMessageAt1 = new LastMessageAt(date);
      const lastMessageAt2 = new LastMessageAt(date);

      expect(lastMessageAt1.equals(lastMessageAt2)).toBe(true);
    });

    it('should not be equal to LastMessageAt with different date', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-02');
      const lastMessageAt1 = new LastMessageAt(date1);
      const lastMessageAt2 = new LastMessageAt(date2);

      expect(lastMessageAt1.equals(lastMessageAt2)).toBe(false);
    });
  });
});
