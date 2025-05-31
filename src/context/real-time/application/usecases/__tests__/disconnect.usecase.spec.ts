// Prueba unitaria para DisconnectUseCase
// Ubicación: src/context/real-time/application/usecases/__tests__/disconnect.usecase.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { DisconnectUseCase, DisconnectUseCaseRequest } from '../disconnect.usecase';
import { CONNECTION_REPOSITORY } from '../../../domain/connection.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { ConnectionUserNotFound } from '../../../domain/errors/connection-user-not-found';

describe('DisconnectUseCase', () => {
  let useCase: DisconnectUseCase;
  let mockRepository: any;
  let mockEventPublisher: any;

  beforeEach(async () => {
    // Crear mocks
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const mockObjectWithContext = {
      commit: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue(mockObjectWithContext),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisconnectUseCase,
        {
          provide: CONNECTION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    useCase = module.get<DisconnectUseCase>(DisconnectUseCase);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('Desconexión exitosa', () => {
    it('debe desconectar un usuario existente', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'socket-123',
      };

      const mockConnection = {
        userId: { value: 'user-123' },
        disconnect: jest.fn().mockReturnValue({
          userId: { value: 'user-123' },
          socketId: null,
        }),
      };

      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockConnection.disconnect).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
    });

    it('debe desconectar un usuario comercial', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'commercial-socket-456',
      };

      const mockCommercialConnection = {
        userId: { value: 'commercial-456' },
        roles: ['commercial'],
        disconnect: jest.fn().mockReturnValue({
          userId: { value: 'commercial-456' },
          socketId: null,
        }),
      };

      mockRepository.findOne.mockResolvedValue(ok(mockCommercialConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockCommercialConnection.disconnect).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debe desconectar un usuario visitante', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'visitor-socket-789',
      };

      const mockVisitorConnection = {
        userId: { value: 'visitor-789' },
        roles: ['visitor'],
        disconnect: jest.fn().mockReturnValue({
          userId: { value: 'visitor-789' },
          socketId: null,
        }),
      };

      mockRepository.findOne.mockResolvedValue(ok(mockVisitorConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockVisitorConnection.disconnect).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('Conexión no encontrada', () => {
    it('debe logar warning cuando la conexión no existe', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'nonexistent-socket',
      };

      mockRepository.findOne.mockResolvedValue(err(new ConnectionUserNotFound('nonexistent-socket')));
      mockRepository.find.mockResolvedValue([
        { userId: { value: 'user1' } },
        { userId: { value: 'user2' } },
      ]);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).not.toHaveBeenCalled();
    });

    it('debe buscar todas las conexiones de visitantes cuando no encuentra la conexión', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'unknown-socket',
      };

      const mockVisitorConnections = [
        { userId: { value: 'visitor1' } },
        { userId: { value: 'visitor2' } },
        { userId: { value: 'visitor3' } },
      ];

      mockRepository.findOne.mockResolvedValue(err(new ConnectionUserNotFound('unknown-socket')));
      mockRepository.find.mockResolvedValue(mockVisitorConnections);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('debe manejar lista vacía de conexiones de visitantes', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'empty-list-socket',
      };

      mockRepository.findOne.mockResolvedValue(err(new ConnectionUserNotFound('empty-list-socket')));
      mockRepository.find.mockResolvedValue([]);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.find).toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Manejo de errores', () => {
    it('debe propagar errores del repositorio al buscar conexión', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'error-socket',
      };

      const repositoryError = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Database connection failed');
    });

    it('debe propagar errores del repositorio al guardar', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'save-error-socket',
      };

      const mockConnection = {
        userId: { value: 'save-error-user' },
        disconnect: jest.fn().mockReturnValue({}),
      };

      const saveError = new Error('Failed to save disconnection');
      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockRejectedValue(saveError);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Failed to save disconnection');
    });

    it('debe manejar errores al buscar todas las conexiones', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'find-all-error-socket',
      };

      mockRepository.findOne.mockResolvedValue(err(new ConnectionUserNotFound('find-all-error-socket')));
      mockRepository.find.mockRejectedValue(new Error('Failed to find all connections'));

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow('Failed to find all connections');
    });
  });

  describe('Integración con EventPublisher', () => {
    it('debe publicar eventos correctamente al desconectar', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'event-socket',
      };

      const mockConnection = {
        userId: { value: 'event-user' },
        disconnect: jest.fn().mockReturnValue({
          userId: { value: 'event-user' },
          socketId: null,
        }),
      };

      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      const mockCommit = mockEventPublisher.mergeObjectContext().commit;
      expect(mockCommit).toHaveBeenCalled();
    });

    it('no debe publicar eventos cuando la conexión no existe', async () => {
      // Arrange
      const request: DisconnectUseCaseRequest = {
        socketId: 'no-event-socket',
      };

      mockRepository.findOne.mockResolvedValue(err(new ConnectionUserNotFound('no-event-socket')));
      mockRepository.find.mockResolvedValue([]);

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventPublisher.mergeObjectContext).not.toHaveBeenCalled();
    });
  });

  describe('Validación de entrada', () => {
    it('debe manejar diferentes formatos de socket ID', async () => {
      // Arrange
      const socketIds = [
        'simple-123',
        'uuid-like-123e4567-e89b-12d3-a456-426614174000',
        'complex_socket-id.789',
      ];

      for (const socketId of socketIds) {
        const request: DisconnectUseCaseRequest = { socketId };

        const mockConnection = {
          userId: { value: `user-for-${socketId}` },
          disconnect: jest.fn().mockReturnValue({}),
        };

        mockRepository.findOne.mockResolvedValue(ok(mockConnection));
        mockRepository.save.mockResolvedValue();

        // Act
        await useCase.execute(request);

        // Assert
        expect(mockConnection.disconnect).toHaveBeenCalled();
        expect(mockRepository.save).toHaveBeenCalled();
      }
    });
  });
});