// Prueba unitaria para ConnectUserCommandHandler
// Ubicación: src/context/real-time/application/command/connect/__tests__/connect-user.command-handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ConnectUserCommandHandler } from '../connect-user.command-handler';
import { ConnectUserCommand } from '../connect-user.command';
import { CONNECTION_REPOSITORY } from '../../../../domain/connection.repository';
import { NOTIFICATION } from '../../../../domain/notification';
import { ConnectionRole } from '../../../../domain/value-objects/connection-role';
import { ok, err } from 'src/context/shared/domain/result';
import { CommercialConnectedEvent } from '../../../../domain/events/commercial-connected.event';
import { ConnectionUserNotFound } from '../../../../domain/errors/connection-user-not-found';
import { USER_ACCOUNT_REPOSITORY } from 'src/context/auth/auth-user/domain/user-account.repository';

describe('ConnectUserCommandHandler', () => {
  let handler: ConnectUserCommandHandler;
  let mockRepository: any;
  let mockNotification: any;
  let mockEventPublisher: any;
  let mockEventBus: any;
  let mockUserAccountRepository: any;

  beforeEach(async () => {
    // Crear mocks
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };

    mockNotification = {
      notify: jest.fn(),
      notifyRole: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
      mergeClassContext: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
      publishAll: jest.fn(),
      bind: jest.fn(),
      combine: jest.fn(),
      onModuleDestroy: jest.fn(),
      publisher: jest.fn(),
    };

    mockUserAccountRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectUserCommandHandler,
        {
          provide: CONNECTION_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: NOTIFICATION,
          useValue: mockNotification,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: mockUserAccountRepository,
        },
      ],
    }).compile();

    handler = module.get<ConnectUserCommandHandler>(ConnectUserCommandHandler);
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  describe('Nueva conexión', () => {
    it('debe crear nueva conexión cuando el usuario no existe', async () => {
      // Arrange
      const command = new ConnectUserCommand(
        'user-123',
        ['visitor'],
        'socket-123',
        '550e8400-e29b-41d4-a716-446655440000',
      );

      // Simular que no se encuentra el usuario (nueva conexión)
      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('user-123')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockNotification.notifyRole).toHaveBeenCalledWith({
        role: 'commercial',
        type: 'visitor:connected',
        payload: {
          socketId: 'socket-123',
          roles: ['visitor'],
        },
      });
    });

    it('debe crear nueva conexión de comercial y disparar evento', async () => {
      // Arrange
      const command = new ConnectUserCommand(
        'commercial-123',
        [ConnectionRole.COMMERCIAL],
        'socket-123',
        '550e8400-e29b-41d4-a716-446655440000',
      );

      // Mock para usuario no encontrado inicialmente
      mockRepository.findOne
        .mockResolvedValueOnce(
          err(new ConnectionUserNotFound('commercial-123')),
        )
        .mockResolvedValueOnce(
          ok({
            toPrimitives: () => ({
              userId: 'commercial-123',
              roles: ['commercial'],
            }),
          }),
        );

      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(CommercialConnectedEvent),
      );
    });
  });

  describe('Conexión existente', () => {
    it('debe actualizar conexión existente cuando el usuario ya existe', async () => {
      // Arrange
      const command = new ConnectUserCommand(
        'user-123',
        ['visitor'],
        'socket-456',
        '550e8400-e29b-41d4-a716-446655440000',
      );

      const mockConnection = {
        userId: { value: 'user-123' },
        connect: jest.fn().mockReturnValue({
          // Conexión actualizada
          userId: { value: 'user-123' },
        }),
      };

      // Simular que se encuentra el usuario (conexión existente)
      mockRepository.findOne.mockResolvedValue(ok(mockConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockConnection.connect).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
    });
  });

  describe('Notificaciones', () => {
    it('debe notificar a los comerciales cuando cualquier usuario se conecta', async () => {
      // Arrange
      const command = new ConnectUserCommand(
        'user-123',
        ['visitor'],
        'socket-123',
        '550e8400-e29b-41d4-a716-446655440000',
      );

      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('user-123')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockNotification.notifyRole).toHaveBeenCalledWith({
        role: 'commercial',
        type: 'visitor:connected',
        payload: {
          socketId: 'socket-123',
          roles: ['visitor'],
        },
      });
    });
  });

  describe('Eventos de comercial', () => {
    it('no debe disparar evento si el usuario no es comercial', async () => {
      // Arrange
      const command = new ConnectUserCommand(
        'visitor-123',
        ['visitor'],
        'socket-123',
        '550e8400-e29b-41d4-a716-446655440000',
      );

      mockRepository.findOne.mockResolvedValue(
        err(new ConnectionUserNotFound('visitor-123')),
      );
      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('debe manejar el caso cuando no se puede encontrar la conexión actualizada', async () => {
      // Arrange
      const command = new ConnectUserCommand(
        'commercial-123',
        [ConnectionRole.COMMERCIAL],
        'socket-123',
        '550e8400-e29b-41d4-a716-446655440000',
      );

      // Primera llamada: usuario no encontrado (nueva conexión)
      // Segunda llamada: tampoco se encuentra después de guardar (caso edge)
      mockRepository.findOne
        .mockResolvedValueOnce(
          err(new ConnectionUserNotFound('commercial-123')),
        )
        .mockResolvedValueOnce(
          err(new ConnectionUserNotFound('commercial-123')),
        );

      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
