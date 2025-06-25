// Prueba unitaria para ConnectUseCase
// Ubicación: src/context/real-time/application/usecases/__tests__/connect.usecase.spec.ts
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { ConnectUseCase, ConnectUseCaseRequest } from '../connect.usecase';
import { CONNECTION_REPOSITORY } from '../../../domain/connection.repository';
import { ok, err } from 'src/context/shared/domain/result';
import { ConnectionUserNotFound } from '../../../domain/errors/connection-user-not-found';
import { USER_ACCOUNT_REPOSITORY } from 'src/context/auth/auth-user/domain/user-account.repository';

describe('ConnectUseCase', () => {
  let useCase: ConnectUseCase;
  let mockRepository: any;
  let mockEventPublisher: any;
  let mockUserAccountRepository: any;

  beforeEach(async () => {
    // Crear mocks
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockObjectWithContext = {
      commit: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue(mockObjectWithContext),
    };

    mockUserAccountRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectUseCase,
        {
          provide: CONNECTION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: mockUserAccountRepository,
        },
      ],
    }).compile();

    useCase = module.get<ConnectUseCase>(ConnectUseCase);
  });

  it('debe estar definido', () => {
    expect(useCase).toBeDefined();
  });

  describe('Nueva conexión', () => {
    it('debe crear nueva conexión cuando el usuario no existe', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'user-123',
        roles: ['visitor'],
        socketId: 'socket-123',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Simular que no se encuentra el usuario
      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('user-123')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
    });

    it('debe crear nueva conexión con múltiples roles', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'user-456',
        roles: ['commercial', 'admin'],
        socketId: 'socket-456',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('user-456')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
    });

    it('debe crear nueva conexión con rol visitor', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'visitor-789',
        roles: ['visitor'],
        socketId: 'socket-789',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('visitor-789')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('Conexión existente', () => {
    it('debe conectar una conexión existente sin socket', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'existing-user',
        roles: ['commercial'],
        socketId: 'new-socket-123',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const mockConnection = {
        socketId: {
          fold: jest.fn().mockImplementation((onEmpty) => {
            // Simular que no hay socket ID (primera función)

            return onEmpty();
          }),
        },
        connect: jest.fn().mockReturnValue({
          userId: { value: 'existing-user' },
          socketId: { value: 'new-socket-123' },
        }),
      };

      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockConnection.socketId.fold).toHaveBeenCalled();
      expect(mockConnection.connect).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
    });

    it('debe logear warning cuando la conexión ya existe con socket', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'connected-user',
        roles: ['visitor'],
        socketId: 'existing-socket',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const mockConnection = {
        socketId: {
          fold: jest.fn().mockImplementation((onEmpty, onValue) => {
            // Simular que ya hay socket ID (segunda función)

            return onValue('existing-socket');
          }),
        },
      };

      mockRepository.findOne.mockResolvedValue(ok(mockConnection));

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockConnection.socketId.fold).toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Manejo de errores', () => {
    it('debe propagar errores del repositorio al buscar', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'user-error',
        roles: ['visitor'],
        socketId: 'socket-error',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const repositoryError = new Error('Database connection failed');
      mockRepository.findOne.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('debe propagar errores del repositorio al guardar nueva conexión', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'user-save-error',
        roles: ['commercial'],
        socketId: 'socket-save-error',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const saveError = new Error('Failed to save connection');
      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('user-save-error')),
      );
      mockRepository.save.mockRejectedValue(saveError);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(
        'Failed to save connection',
      );
    });

    it('debe propagar errores del repositorio al guardar conexión existente', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'existing-save-error',
        roles: ['admin'],
        socketId: 'socket-update-error',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const mockConnection = {
        socketId: {
          fold: jest.fn().mockImplementation((onEmpty) => {
            return onEmpty();
          }),
        },
        connect: jest.fn().mockReturnValue({}),
      };

      const updateError = new Error('Failed to update connection');
      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockRejectedValue(updateError);

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(
        'Failed to update connection',
      );
    });
  });

  describe('Validación de entrada', () => {
    it('debe manejar roles vacíos', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'user-no-roles',
        roles: [],
        socketId: 'socket-no-roles',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('user-no-roles')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debe manejar diferentes tipos de socket IDs', async () => {
      // Arrange
      const socketIds = [
        'socket-123',
        'ws-connection-456',
        'uuid-like-789-abc-def',
      ];

      for (const socketId of socketIds) {
        const request: ConnectUseCaseRequest = {
          connectionId: `user-socket-123`,
          roles: ['visitor'],
          socketId,
          companyId: '550e8400-e29b-41d4-a716-446655440000',
        };

        mockRepository.findOne.mockResolvedValue(
          err(new ConnectionUserNotFound(`user-socket-123`)),
        );
        mockRepository.save.mockResolvedValue();

        // Act
        await useCase.execute(request);

        // Assert
        expect(mockRepository.save).toHaveBeenCalled();
      }
    });
  });

  describe('Integración con EventPublisher', () => {
    it('debe publicar eventos correctamente para nueva conexión', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'event-user',
        roles: ['commercial'],
        socketId: 'event-socket',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('event-user')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      const mockCommit = mockEventPublisher.mergeObjectContext().commit;
      expect(mockCommit).toHaveBeenCalled();
    });

    it('debe publicar eventos correctamente para conexión existente actualizada', async () => {
      // Arrange
      const request: ConnectUseCaseRequest = {
        connectionId: 'update-event-user',
        roles: ['visitor'],
        socketId: 'update-event-socket',
        companyId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const mockConnection = {
        socketId: {
          fold: jest.fn().mockImplementation((onEmpty) => {
            return onEmpty();
          }),
        },
        connect: jest.fn().mockReturnValue({}),
      };

      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
    });
  });
});
