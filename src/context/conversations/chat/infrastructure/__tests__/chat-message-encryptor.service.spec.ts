import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatMessageEncryptorService } from '../chat-message-encryptor.service';

describe('ChatMessageEncryptorService', () => {
  let service: ChatMessageEncryptorService;
  let configService: jest.Mocked<ConfigService>;

  const testMessage = 'Este es un mensaje de prueba para el chat';
  const testEncryptionKey =
    '0f0dd60415efd0a1d5c4409ed92fc1df3e4cfc517c4d3ad7d1e1d828f45f2bd4';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ENCRYPTION_KEY') {
          return testEncryptionKey;
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessageEncryptorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ChatMessageEncryptorService>(
      ChatMessageEncryptorService,
    );
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt a message successfully', async () => {
      // Act
      const result = await service.encrypt(testMessage);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain(':'); // version:iv:encryptedData format
      expect(result).toMatch(/^v\d+:/); // Should start with version
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
    });

    it('should generate different encrypted results for the same message', async () => {
      // Act
      const result1 = await service.encrypt(testMessage);
      const result2 = await service.encrypt(testMessage);

      // Assert
      expect(result1).not.toBe(result2); // Should be different due to random IV
      expect(result1).toContain(':');
      expect(result2).toContain(':');
      expect(result1).toMatch(/^v\d+:/);
      expect(result2).toMatch(/^v\d+:/);
    });

    it('should handle empty message', async () => {
      // Act
      const result = await service.encrypt('');

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain(':');
      expect(result).toMatch(/^v\d+:/);
    });

    it('should throw error when encryption fails', async () => {
      // Create a new service with invalid key for this test
      const mockConfigServiceInvalid = {
        get: jest.fn((key: string) => {
          if (key === 'ENCRYPTION_KEY') {
            return 'invalid-key'; // Invalid key format
          }
          return undefined;
        }),
      };

      // Act & Assert
      await expect(
        Test.createTestingModule({
          providers: [
            ChatMessageEncryptorService,
            {
              provide: ConfigService,
              useValue: mockConfigServiceInvalid,
            },
          ],
        }).compile(),
      ).rejects.toThrow(
        'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)',
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt a message successfully', async () => {
      // Arrange
      const encryptedMessage = await service.encrypt(testMessage);

      // Act
      const result = await service.decrypt(encryptedMessage);

      // Assert
      expect(result).toBe(testMessage);
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_KEY');
    });

    it('should decrypt empty message successfully', async () => {
      // Arrange
      const emptyMessage = '';
      const encryptedMessage = await service.encrypt(emptyMessage);

      // Act
      const result = await service.decrypt(encryptedMessage);

      // Assert
      expect(result).toBe(emptyMessage);
    });

    it('should throw error when encrypted message format is invalid', async () => {
      // Arrange
      const invalidFormat = 'invalid-format-without-colon';

      // Act & Assert
      await expect(service.decrypt(invalidFormat)).rejects.toThrow(
        'Failed to decrypt chat message',
      );
    });

    it('should throw error when IV is missing', async () => {
      // Arrange
      const missingIv = 'v1::encrypteddata';

      // Act & Assert
      await expect(service.decrypt(missingIv)).rejects.toThrow(
        'Failed to decrypt chat message',
      );
    });

    it('should throw error when encrypted data is missing', async () => {
      // Arrange
      const missingData = 'v1:abcd1234abcd1234abcd1234abcd1234:';

      // Act & Assert
      await expect(service.decrypt(missingData)).rejects.toThrow(
        'Failed to decrypt chat message',
      );
    });

    it('should throw error when encrypted data is corrupted', async () => {
      // Arrange
      const corruptedData =
        'v1:abcd1234abcd1234abcd1234abcd1234:invalid-encrypted-data';

      // Act & Assert
      await expect(service.decrypt(corruptedData)).rejects.toThrow(
        'Failed to decrypt chat message',
      );
    });

    it('should throw error when using wrong encryption key', async () => {
      // Arrange
      const encryptedMessage = await service.encrypt(testMessage);

      // Create a new service with different key for this test
      const wrongKey =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const mockConfigServiceWrong = {
        get: jest.fn((key: string) => {
          if (key === 'ENCRYPTION_KEY') {
            return wrongKey;
          }
          return undefined;
        }),
      };

      const moduleWrong = await Test.createTestingModule({
        providers: [
          ChatMessageEncryptorService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceWrong,
          },
        ],
      }).compile();

      const wrongService = moduleWrong.get<ChatMessageEncryptorService>(
        ChatMessageEncryptorService,
      );

      // Act & Assert
      await expect(wrongService.decrypt(encryptedMessage)).rejects.toThrow(
        'Failed to decrypt chat message',
      );
    });
  });

  describe('encrypt/decrypt integration', () => {
    it('should successfully encrypt and decrypt multiple messages', async () => {
      // Arrange
      const messages = [
        'Mensaje corto',
        'Este es un mensaje más largo con caracteres especiales: áéíóú ñ @ # $ % & * ( ) _ + = { } [ ] | \\ : ; " \' < > , . ? / ~ `',
        'Message with numbers 123456789 and symbols !@#$%^&*()',
        'Mensaje con emojis 😀 😎 🚀 ❤️',
        '中文消息',
        'Очень длинное сообщение на русском языке с множеством символов и пробелов',
      ];

      // Act & Assert
      for (const message of messages) {
        const encrypted = await service.encrypt(message);
        const decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(message);
      }
    });

    it('should handle large messages', async () => {
      // Arrange
      const largeMessage = 'A'.repeat(10000); // 10KB message

      // Act
      const encrypted = await service.encrypt(largeMessage);
      const decrypted = await service.decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(largeMessage);
    });

    it('should support legacy format decryption', async () => {
      // Arrange - simulate legacy format (iv:data without version)
      const legacyEncrypted = await service.encrypt(testMessage);
      const parts = legacyEncrypted.split(':');
      const legacyFormat = `${parts[1]}:${parts[2]}`; // Remove version prefix

      // Act
      const decrypted = await service.decrypt(legacyFormat);

      // Assert
      expect(decrypted).toBe(testMessage);
    });
  });
});
