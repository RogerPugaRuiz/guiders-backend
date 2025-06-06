// Prueba unitaria para ChatMessageEncryptionService
// Ubicación: src/context/conversations/message/infrastructure/services/__tests__/chat-message-encryption.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChatMessageEncryptionService } from '../chat-message-encryption.service';
import * as bcrypt from 'bcrypt';

// Mock del módulo bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('ChatMessageEncryptionService', () => {
  let service: ChatMessageEncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatMessageEncryptionService],
    }).compile();

    service = module.get<ChatMessageEncryptionService>(
      ChatMessageEncryptionService,
    );
  });

  beforeEach(() => {
    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('encryptMessage', () => {
    it('debe encriptar un mensaje correctamente', async () => {
      // Arrange
      const message = 'Hola, este es un mensaje del chat';
      const expectedEncryptedMessage = '$2b$10$encryptedMessageExample';

      mockedBcrypt.hash.mockResolvedValue(expectedEncryptedMessage as never);

      // Act
      const result = await service.encryptMessage(message);

      // Assert
      expect(result).toBe(expectedEncryptedMessage);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(message, 10);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
    });

    it('debe usar 10 salt rounds por defecto', async () => {
      // Arrange
      const message = 'Mensaje de prueba';
      const expectedEncryptedMessage = '$2b$10$anotherEncryptedExample';

      mockedBcrypt.hash.mockResolvedValue(expectedEncryptedMessage as never);

      // Act
      await service.encryptMessage(message);

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(message, 10);
    });

    it('debe manejar mensajes vacíos', async () => {
      // Arrange
      const message = '';
      const expectedEncryptedMessage = '$2b$10$emptyMessageHash';

      mockedBcrypt.hash.mockResolvedValue(expectedEncryptedMessage as never);

      // Act
      const result = await service.encryptMessage(message);

      // Assert
      expect(result).toBe(expectedEncryptedMessage);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('', 10);
    });

    it('debe manejar mensajes con caracteres especiales', async () => {
      // Arrange
      const message =
        'Mensaje con émojis 😀🎉 y caracteres especiales @#$%^&*()';
      const expectedEncryptedMessage = '$2b$10$specialCharsEncryptedMessage';

      mockedBcrypt.hash.mockResolvedValue(expectedEncryptedMessage as never);

      // Act
      const result = await service.encryptMessage(message);

      // Assert
      expect(result).toBe(expectedEncryptedMessage);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(message, 10);
    });

    it('debe propagar errores de bcrypt.hash', async () => {
      // Arrange
      const message = 'Mensaje de prueba';
      const error = new Error('Bcrypt hash error');

      (mockedBcrypt.hash as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(service.encryptMessage(message)).rejects.toThrow(
        'Bcrypt hash error',
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(message, 10);
    });

    it('debe manejar mensajes muy largos', async () => {
      // Arrange
      const message = 'a'.repeat(1000);
      const expectedEncryptedMessage = '$2b$10$longMessageHash';

      mockedBcrypt.hash.mockResolvedValue(expectedEncryptedMessage as never);

      // Act
      const result = await service.encryptMessage(message);

      // Assert
      expect(result).toBe(expectedEncryptedMessage);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(message, 10);
    });
  });

  describe('verifyMessage', () => {
    it('debe verificar correctamente un mensaje válido', async () => {
      // Arrange
      const plainMessage = 'Mensaje original';
      const encryptedMessage = '$2b$10$encryptedMessageExample';

      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.verifyMessage(
        plainMessage,
        encryptedMessage,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        plainMessage,
        encryptedMessage,
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('debe retornar false para un mensaje inválido', async () => {
      // Arrange
      const plainMessage = 'Mensaje incorrecto';
      const encryptedMessage = '$2b$10$encryptedMessageExample';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.verifyMessage(
        plainMessage,
        encryptedMessage,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        plainMessage,
        encryptedMessage,
      );
    });

    it('debe manejar mensaje vacío en verificación', async () => {
      // Arrange
      const plainMessage = '';
      const encryptedMessage = '$2b$10$encryptedMessageExample';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.verifyMessage(
        plainMessage,
        encryptedMessage,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('', encryptedMessage);
    });

    it('debe manejar hash vacío en verificación', async () => {
      // Arrange
      const plainMessage = 'Mensaje de prueba';
      const encryptedMessage = '';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.verifyMessage(
        plainMessage,
        encryptedMessage,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(plainMessage, '');
    });

    it('debe propagar errores de bcrypt.compare', async () => {
      // Arrange
      const plainMessage = 'Mensaje de prueba';
      const encryptedMessage = '$2b$10$encryptedMessageExample';
      const error = new Error('Bcrypt compare error');

      (mockedBcrypt.compare as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.verifyMessage(plainMessage, encryptedMessage),
      ).rejects.toThrow('Bcrypt compare error');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        plainMessage,
        encryptedMessage,
      );
    });

    it('debe manejar mensajes con caracteres especiales en verificación', async () => {
      // Arrange
      const plainMessage =
        'Mensaje con émojis 😀🎉 y caracteres especiales @#$%^&*()';
      const encryptedMessage = '$2b$10$specialCharsEncryptedMessage';

      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.verifyMessage(
        plainMessage,
        encryptedMessage,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        plainMessage,
        encryptedMessage,
      );
    });
  });

  describe('integración', () => {
    it('debe tener métodos encryptMessage y verifyMessage', () => {
      // Assert
      expect(typeof service.encryptMessage).toBe('function');
      expect(typeof service.verifyMessage).toBe('function');
    });

    it('debe usar consistentemente los salt rounds en múltiples encriptaciones', async () => {
      // Arrange
      const messages = ['mensaje1', 'mensaje2', 'mensaje3'];
      const hashes = ['hash1', 'hash2', 'hash3'];

      mockedBcrypt.hash
        .mockResolvedValueOnce(hashes[0] as never)
        .mockResolvedValueOnce(hashes[1] as never)
        .mockResolvedValueOnce(hashes[2] as never);

      // Act
      await Promise.all(messages.map((m) => service.encryptMessage(m)));

      // Assert
      messages.forEach((message, index) => {
        expect(mockedBcrypt.hash).toHaveBeenNthCalledWith(
          index + 1,
          message,
          10,
        );
      });
    });
  });
});
