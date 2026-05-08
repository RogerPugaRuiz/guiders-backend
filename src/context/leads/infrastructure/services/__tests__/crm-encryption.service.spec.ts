import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CrmEncryptionService } from '../crm-encryption.service';

describe('CrmEncryptionService', () => {
  let service: CrmEncryptionService;
  let configService: jest.Mocked<ConfigService>;

  // Clave de prueba: 32 bytes = 64 chars hex
  const TEST_KEY =
    '0f0dd60415efd0a1d5c4409ed92fc1df3e4cfc517c4d3ad7d1e1d828f45f2bd4';

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        CrmEncryptionService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CrmEncryptionService>(CrmEncryptionService);
  });

  describe('encrypt + tryDecrypt', () => {
    it('debe cifrar y descifrar correctamente un token', () => {
      configService.get.mockReturnValue(TEST_KEY);
      const plainText = 'my-secret-api-key-123';

      const encrypted = service.encrypt(plainText);

      expect(encrypted).not.toBe(plainText);
      expect(encrypted).toContain(':');

      const decrypted = service.tryDecrypt(encrypted);
      expect(decrypted).toBe(plainText);
    });

    it('debe producir cifrados diferentes para el mismo texto (IV aleatorio)', () => {
      configService.get.mockReturnValue(TEST_KEY);
      const plainText = 'same-token';

      const encrypted1 = service.encrypt(plainText);
      const encrypted2 = service.encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
      expect(service.tryDecrypt(encrypted1)).toBe(plainText);
      expect(service.tryDecrypt(encrypted2)).toBe(plainText);
    });

    it('debe retornar el texto plano sin cifrar si ENCRYPTION_KEY no está configurada', () => {
      configService.get.mockReturnValue(null);
      const plainText = 'plaintext-token';

      const result = service.encrypt(plainText);

      expect(result).toBe(plainText);
    });

    it('tryDecrypt debe retornar texto plano legacy sin errores (fallback)', () => {
      configService.get.mockReturnValue(TEST_KEY);
      const legacyToken = 'plaintext-legacy-token';

      // Token legacy no tiene el formato iv:encrypted (no ':' en pos 32)
      const result = service.tryDecrypt(legacyToken);

      expect(result).toBe(legacyToken);
    });

    it('tryDecrypt debe retornar el valor original si ocurre un error al descifrar', () => {
      configService.get.mockReturnValue(TEST_KEY);
      // Formato válido (pos 32) pero datos corruptos
      const corrupted = 'a'.repeat(32) + ':invalid-hex-data';

      const result = service.tryDecrypt(corrupted);

      expect(result).toBe(corrupted);
    });
  });
});
