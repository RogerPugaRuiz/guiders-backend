import { LastMessage } from '../last-message';

describe('LastMessage', () => {
  describe('constructor', () => {
    it('should create LastMessage with valid string', () => {
      const message = 'Hello world';

      const lastMessage = new LastMessage(message);

      expect(lastMessage.value).toBe(message);
    });

    it('should throw error with empty string', () => {
      expect(() => {
        new LastMessage('');
      }).toThrow('Invalid Last Message');
    });

    it('should throw error with non-string value', () => {
      expect(() => {
        new LastMessage(null as unknown as string);
      }).toThrow('Invalid Last Message');
    });

    it('should accept long messages', () => {
      const longMessage = 'a'.repeat(1000);

      const lastMessage = new LastMessage(longMessage);

      expect(lastMessage.value).toBe(longMessage);
    });
  });

  describe('equals', () => {
    it('should be equal to LastMessage with same value', () => {
      const message = 'Hello world';
      const lastMessage1 = new LastMessage(message);
      const lastMessage2 = new LastMessage(message);

      expect(lastMessage1.equals(lastMessage2)).toBe(true);
    });

    it('should not be equal to LastMessage with different value', () => {
      const lastMessage1 = new LastMessage('Hello');
      const lastMessage2 = new LastMessage('World');

      expect(lastMessage1.equals(lastMessage2)).toBe(false);
    });
  });
});
