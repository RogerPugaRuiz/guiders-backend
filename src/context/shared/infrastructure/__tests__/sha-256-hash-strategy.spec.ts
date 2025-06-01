import { Sha256HashStrategy } from '../sha-256-hash-strategy';

describe('Sha256HashStrategy', () => {
  let hashStrategy: Sha256HashStrategy;

  beforeEach(() => {
    hashStrategy = new Sha256HashStrategy();
  });

  describe('hash', () => {
    it('should hash a plain text string correctly', async () => {
      // Arrange
      const plainText = 'test-string';

      // Act
      const result = await hashStrategy.hash(plainText);

      // Assert
      expect(result).toBe(
        'ffe65f1d98fafedea3514adc956c8ada5980c6c5d2552fd61f48401aefd5c00e',
      );
      expect(result).toHaveLength(64); // SHA-256 produces 64-character hex string
      expect(typeof result).toBe('string');
    });

    it('should produce consistent hashes for the same input', async () => {
      // Arrange
      const plainText = 'consistent-input';

      // Act
      const hash1 = await hashStrategy.hash(plainText);
      const hash2 = await hashStrategy.hash(plainText);

      // Assert
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      // Arrange
      const plainText1 = 'input1';
      const plainText2 = 'input2';

      // Act
      const hash1 = await hashStrategy.hash(plainText1);
      const hash2 = await hashStrategy.hash(plainText2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', async () => {
      // Arrange
      const plainText = '';

      // Act
      const result = await hashStrategy.hash(plainText);

      // Assert
      expect(result).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
      expect(result).toHaveLength(64);
    });

    it('should handle special characters and unicode', async () => {
      // Arrange
      const plainText = '🚀 Special chars: éñí@#$%^&*()';

      // Act
      const result = await hashStrategy.hash(plainText);

      // Assert
      expect(result).toHaveLength(64);
      expect(typeof result).toBe('string');
    });

    it('should handle very long strings', async () => {
      // Arrange
      const plainText = 'a'.repeat(10000);

      // Act
      const result = await hashStrategy.hash(plainText);

      // Assert
      expect(result).toHaveLength(64);
      expect(typeof result).toBe('string');
    });
  });

  describe('compare', () => {
    it('should return true when comparing same plain text with its hash', async () => {
      // Arrange
      const plainText = 'test-password';
      const hashed = await hashStrategy.hash(plainText);

      // Act
      const result = await hashStrategy.compare(plainText, hashed);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when comparing different text with hash', async () => {
      // Arrange
      const plainText = 'correct-password';
      const wrongText = 'wrong-password';
      const hashed = await hashStrategy.hash(plainText);

      // Act
      const result = await hashStrategy.compare(wrongText, hashed);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when comparing with invalid hash', async () => {
      // Arrange
      const plainText = 'test-password';
      const invalidHash = 'invalid-hash-value';

      // Act
      const result = await hashStrategy.compare(plainText, invalidHash);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle empty strings correctly', async () => {
      // Arrange
      const emptyString = '';
      const hashedEmpty = await hashStrategy.hash(emptyString);

      // Act
      const result = await hashStrategy.compare(emptyString, hashedEmpty);

      // Assert
      expect(result).toBe(true);
    });

    it('should be case sensitive', async () => {
      // Arrange
      const plainText = 'TestPassword';
      const lowerCaseText = 'testpassword';
      const hashed = await hashStrategy.hash(plainText);

      // Act
      const result = await hashStrategy.compare(lowerCaseText, hashed);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle special characters in comparison', async () => {
      // Arrange
      const plainText = 'password@123!';
      const hashed = await hashStrategy.hash(plainText);

      // Act
      const correctResult = await hashStrategy.compare(plainText, hashed);
      const incorrectResult = await hashStrategy.compare(
        'password@123?',
        hashed,
      );

      // Assert
      expect(correctResult).toBe(true);
      expect(incorrectResult).toBe(false);
    });
  });
});
