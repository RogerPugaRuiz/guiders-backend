// Prueba unitaria para BcryptHashService
// Ubicación: src/context/auth/auth-user/infrastructure/services/__tests__/bcrypt-hash.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BcryptHashService } from '../bcrypt-hash.service';
import * as bcrypt from 'bcrypt';

// Mock del módulo bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('BcryptHashService', () => {
  let service: BcryptHashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BcryptHashService],
    }).compile();

    service = module.get<BcryptHashService>(BcryptHashService);
  });

  beforeEach(() => {
    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('debe hashear una contraseña correctamente', async () => {
      // Arrange
      const password = 'mySecretPassword123';
      const expectedHash = '$2b$10$hashedPasswordExample';
      
      mockedBcrypt.hash.mockResolvedValue(expectedHash as never);

      // Act
      const result = await service.hash(password);

      // Assert
      expect(result).toBe(expectedHash);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
    });

    it('debe usar 10 salt rounds por defecto', async () => {
      // Arrange
      const password = 'testPassword';
      const expectedHash = '$2b$10$anotherHashExample';
      
      mockedBcrypt.hash.mockResolvedValue(expectedHash as never);

      // Act
      await service.hash(password);

      // Assert
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('debe manejar contraseñas vacías', async () => {
      // Arrange
      const password = '';
      const expectedHash = '$2b$10$emptyPasswordHash';
      
      mockedBcrypt.hash.mockResolvedValue(expectedHash as never);

      // Act
      const result = await service.hash(password);

      // Assert
      expect(result).toBe(expectedHash);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('', 10);
    });

    it('debe manejar contraseñas con caracteres especiales', async () => {
      // Arrange
      const password = 'P@ssw0rd!$#%^&*()';
      const expectedHash = '$2b$10$specialCharHash';
      
      mockedBcrypt.hash.mockResolvedValue(expectedHash as never);

      // Act
      const result = await service.hash(password);

      // Assert
      expect(result).toBe(expectedHash);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('debe propagar errores de bcrypt.hash', async () => {
      // Arrange
      const password = 'testPassword';
      const error = new Error('Bcrypt hash error');
      
      mockedBcrypt.hash.mockRejectedValue(error);

      // Act & Assert
      await expect(service.hash(password)).rejects.toThrow('Bcrypt hash error');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('compare', () => {
    it('debe comparar contraseña y hash correctamente cuando coinciden', async () => {
      // Arrange
      const password = 'mySecretPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('debe comparar contraseña y hash correctamente cuando no coinciden', async () => {
      // Arrange
      const password = 'wrongPassword';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('debe manejar contraseña vacía en comparación', async () => {
      // Arrange
      const password = '';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('', hashedPassword);
    });

    it('debe manejar hash vacío en comparación', async () => {
      // Arrange
      const password = 'testPassword';
      const hashedPassword = '';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act
      const result = await service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, '');
    });

    it('debe propagar errores de bcrypt.compare', async () => {
      // Arrange
      const password = 'testPassword';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      const error = new Error('Bcrypt compare error');
      
      mockedBcrypt.compare.mockRejectedValue(error);

      // Act & Assert
      await expect(service.compare(password, hashedPassword)).rejects.toThrow('Bcrypt compare error');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('debe manejar contraseñas con caracteres especiales en comparación', async () => {
      // Arrange
      const password = 'P@ssw0rd!$#%^&*()';
      const hashedPassword = '$2b$10$specialCharHashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.compare(password, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });

  describe('integración', () => {
    it('debe implementar la interfaz UserPasswordHasher', () => {
      // Assert
      expect(typeof service.hash).toBe('function');
      expect(typeof service.compare).toBe('function');
    });

    it('debe usar consistently los salt rounds en múltiples hash', async () => {
      // Arrange
      const passwords = ['password1', 'password2', 'password3'];
      const hashes = ['hash1', 'hash2', 'hash3'];
      
      mockedBcrypt.hash
        .mockResolvedValueOnce(hashes[0] as never)
        .mockResolvedValueOnce(hashes[1] as never)
        .mockResolvedValueOnce(hashes[2] as never);

      // Act
      await Promise.all(passwords.map(p => service.hash(p)));

      // Assert
      passwords.forEach((password, index) => {
        expect(mockedBcrypt.hash).toHaveBeenNthCalledWith(index + 1, password, 10);
      });
    });
  });
});