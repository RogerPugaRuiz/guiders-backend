import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { RegisterVisitor } from '../register-visitor.usecase';
import { AuthVisitorRepository } from '../../../domain/repositories/auth-visitor.repository';
import { ValidateDomainApiKey } from '../../services/validate-domain-api-key';
import { VisitorAccount } from '../../../domain/models/visitor-account.aggregate';
import { VisitorAccountApiKey } from '../../../domain/models/visitor-account-api-key';
import {
  InvalidDomainError,
  VisitorAccountAlreadyExistError,
} from '../../error/auth-visitor.errors';

describe('RegisterVisitor', () => {
  let useCase: RegisterVisitor;
  let repository: jest.Mocked<AuthVisitorRepository>;
  let validateDomainApiKey: jest.Mocked<ValidateDomainApiKey>;
  let eventPublisher: EventPublisher;
  let mockMergeObjectContext: jest.SpyInstance;

  const mockApiKey = 'test-api-key';
  const mockClientId = 123456;
  const mockUserAgent = 'Mozilla/5.0 Test Browser';
  const mockDomain = 'example.com';
  const mockDomainWithWww = 'www.example.com';

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findByClientID: jest.fn(),
    };

    const mockValidateDomainApiKey = {
      validate: jest.fn(),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterVisitor,
        {
          provide: 'AuthVisitorRepository',
          useValue: mockRepository,
        },
        {
          provide: 'VALIDATE_DOMAIN_API_KEY',
          useValue: mockValidateDomainApiKey,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    useCase = module.get<RegisterVisitor>(RegisterVisitor);
    repository = module.get('AuthVisitorRepository');
    validateDomainApiKey = module.get('VALIDATE_DOMAIN_API_KEY');
    eventPublisher = module.get<EventPublisher>(EventPublisher);
    mockMergeObjectContext = jest.spyOn(eventPublisher, 'mergeObjectContext');

    // Mock del logger para evitar logs en los tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    describe('cuando se registra un visitante con dominio sin www', () => {
      it('debería registrar el visitante exitosamente', async () => {
        // Arrange
        repository.findByClientID.mockResolvedValue(null);
        validateDomainApiKey.validate.mockResolvedValue(true);

        const mockVisitorAccount = { commit: jest.fn() } as any;
        mockMergeObjectContext.mockReturnValue(mockVisitorAccount);

        // Act
        await useCase.execute(
          mockApiKey,
          mockClientId,
          mockUserAgent,
          mockDomain,
        );

        // Assert
        expect(validateDomainApiKey.validate).toHaveBeenCalledWith({
          apiKey: expect.any(VisitorAccountApiKey),
          domain: mockDomain, // El dominio ya está normalizado (sin www)
        });
        expect(repository.findByClientID).toHaveBeenCalledWith(mockClientId);
        expect(repository.save).toHaveBeenCalledWith(mockVisitorAccount);
        expect(mockVisitorAccount.commit).toHaveBeenCalled();
      });
    });

    describe('cuando se registra un visitante con dominio con www', () => {
      it('debería normalizar el dominio eliminando www y registrar exitosamente', async () => {
        // Arrange
        repository.findByClientID.mockResolvedValue(null);
        validateDomainApiKey.validate.mockResolvedValue(true);

        const mockVisitorAccount = { commit: jest.fn() } as any;
        mockMergeObjectContext.mockReturnValue(mockVisitorAccount);

        // Act
        await useCase.execute(
          mockApiKey,
          mockClientId,
          mockUserAgent,
          mockDomainWithWww,
        );

        // Assert
        expect(validateDomainApiKey.validate).toHaveBeenCalledWith({
          apiKey: expect.any(VisitorAccountApiKey),
          domain: mockDomain, // Debería pasar el dominio normalizado (sin www)
        });
        expect(repository.findByClientID).toHaveBeenCalledWith(mockClientId);
        expect(repository.save).toHaveBeenCalledWith(mockVisitorAccount);
        expect(mockVisitorAccount.commit).toHaveBeenCalled();
      });
    });

    describe('cuando el dominio no es válido', () => {
      it('debería lanzar InvalidDomainError', async () => {
        // Arrange
        validateDomainApiKey.validate.mockResolvedValue(false);

        // Act & Assert
        await expect(
          useCase.execute(mockApiKey, mockClientId, mockUserAgent, mockDomain),
        ).rejects.toThrow(InvalidDomainError);

        expect(validateDomainApiKey.validate).toHaveBeenCalledWith({
          apiKey: expect.any(VisitorAccountApiKey),
          domain: mockDomain,
        });
        expect(repository.findByClientID).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });
    });

    describe('cuando el dominio con www no es válido', () => {
      it('debería normalizar el dominio y lanzar InvalidDomainError', async () => {
        // Arrange
        validateDomainApiKey.validate.mockResolvedValue(false);

        // Act & Assert
        await expect(
          useCase.execute(
            mockApiKey,
            mockClientId,
            mockUserAgent,
            mockDomainWithWww,
          ),
        ).rejects.toThrow(InvalidDomainError);

        expect(validateDomainApiKey.validate).toHaveBeenCalledWith({
          apiKey: expect.any(VisitorAccountApiKey),
          domain: mockDomain, // Debería pasar el dominio normalizado
        });
        expect(repository.findByClientID).not.toHaveBeenCalled();
        expect(repository.save).not.toHaveBeenCalled();
      });
    });

    describe('cuando ya existe una cuenta de visitante con el mismo client ID', () => {
      it('debería lanzar VisitorAccountAlreadyExistError', async () => {
        // Arrange
        validateDomainApiKey.validate.mockResolvedValue(true);
        const existingAccount = {} as VisitorAccount;
        repository.findByClientID.mockResolvedValue(existingAccount);

        // Act & Assert
        await expect(
          useCase.execute(mockApiKey, mockClientId, mockUserAgent, mockDomain),
        ).rejects.toThrow(VisitorAccountAlreadyExistError);

        expect(validateDomainApiKey.validate).toHaveBeenCalledWith({
          apiKey: expect.any(VisitorAccountApiKey),
          domain: mockDomain,
        });
        expect(repository.findByClientID).toHaveBeenCalledWith(mockClientId);
        expect(repository.save).not.toHaveBeenCalled();
      });
    });
  });

  describe('normalizeDomain', () => {
    it('debería eliminar el prefijo www. de un dominio', () => {
      // Arrange & Act
      const result = (useCase as any).normalizeDomain('www.example.com');

      // Assert
      expect(result).toBe('example.com');
    });

    it('debería mantener el dominio sin cambios si no tiene prefijo www', () => {
      // Arrange & Act
      const result = (useCase as any).normalizeDomain('example.com');

      // Assert
      expect(result).toBe('example.com');
    });

    it('debería manejar correctamente dominios que contienen www pero no como prefijo', () => {
      // Arrange & Act
      const result = (useCase as any).normalizeDomain('test-www.example.com');

      // Assert
      expect(result).toBe('test-www.example.com');
    });

    it('debería manejar correctamente subdominios que empiezan con www', () => {
      // Arrange & Act
      const result = (useCase as any).normalizeDomain(
        'www.subdomain.example.com',
      );

      // Assert
      expect(result).toBe('subdomain.example.com');
    });
  });
});
