// Prueba unitaria para ConnectUserCommandHandler
// Ubicación: src/context/real-time/application/command/connect/__tests__/connect-user.command-handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventBus, EventPublisher } from '@nestjs/cqrs';
import { ConnectUserCommandHandler } from '../connect-user.command-handler';
import { ConnectUserCommand } from '../connect-user.command';
import { CONNECTION_REPOSITORY, ConnectionRepository } from '../../../../domain/connection.repository';
import { INotification, NOTIFICATION } from '../../../../domain/notification';
import { ConnectionUser } from '../../../../domain/connection-user';
import { ConnectionRole } from '../../../../domain/value-objects/connection-role';
import { Result } from 'src/context/shared/domain/result';
import { CommercialConnectedEvent } from '../../../../domain/events/commercial-connected.event';

describe('ConnectUserCommandHandler', () => {
  let handler: ConnectUserCommandHandler;
  let mockRepository: jest.Mocked<ConnectionRepository>;
  let mockNotification: jest.Mocked<INotification>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    // Crear mocks
    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockNotification = {
      notify: jest.fn(),
      notifyRole: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
    };

    mockEventBus = {
      publish: jest.fn(),
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
      const command = new ConnectUserCommand('user-123', ['visitor'], 'socket-123');
      
      // Simular que no se encuentra el usuario (nueva conexión)
      mockRepository.findOne.mockResolvedValue(Result.failure(new Error('Not found')));
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
      const command = new ConnectUserCommand('commercial-123', ['commercial'], 'socket-123');
      
      // Mock para usuario no encontrado inicialmente
      mockRepository.findOne
        .mockResolvedValueOnce(Result.failure(new Error('Not found')))
        .mockResolvedValueOnce(Result.success({
          toPrimitives: () => ({ userId: 'commercial-123', roles: ['commercial'] }),
        } as any));

      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(CommercialConnectedEvent)
      );
    });
  });

  describe('Conexión existente', () => {
    it('debe actualizar conexión existente cuando el usuario ya existe', async () => {
      // Arrange
      const command = new ConnectUserCommand('user-123', ['visitor'], 'socket-456');
      
      const mockConnection = {
        userId: { value: 'user-123' },
        connect: jest.fn().mockReturnValue({
          // Conexión actualizada
          userId: { value: 'user-123' },
        }),
      } as any;

      // Simular que se encuentra el usuario (conexión existente)
      mockRepository.findOne.mockResolvedValue(Result.success(mockConnection));
      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockConnection.connect).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalled();
    });

    it('debe actualizar conexión de comercial existente y disparar evento', async () => {
      // Arrange
      const command = new ConnectUserCommand('commercial-123', ['commercial'], 'socket-456');
      
      const mockConnection = {
        userId: { value: 'commercial-123' },
        connect: jest.fn().mockReturnValue({
          userId: { value: 'commercial-123' },
          toPrimitives: () => ({ userId: 'commercial-123', roles: ['commercial'] }),
        }),
      } as any;

      // Primera llamada para encontrar conexión existente
      // Segunda llamada para obtener la conexión actualizada y disparar evento
      mockRepository.findOne
        .mockResolvedValueOnce(Result.success(mockConnection))
        .mockResolvedValueOnce(Result.success({
          toPrimitives: () => ({ userId: 'commercial-123', roles: ['commercial'] }),
        } as any));

      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(CommercialConnectedEvent)
      );
    });
  });

  describe('Notificaciones', () => {
    it('debe notificar a los comerciales cuando cualquier usuario se conecta', async () => {
      // Arrange
      const command = new ConnectUserCommand('user-123', ['visitor'], 'socket-123');
      
      mockRepository.findOne.mockResolvedValue(Result.failure(new Error('Not found')));
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
      const command = new ConnectUserCommand('visitor-123', ['visitor'], 'socket-123');
      
      mockRepository.findOne.mockResolvedValue(Result.failure(new Error('Not found')));
      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('debe manejar el caso cuando no se puede encontrar la conexión actualizada', async () => {
      // Arrange
      const command = new ConnectUserCommand('commercial-123', ['commercial'], 'socket-123');
      
      // Primera llamada: usuario no encontrado (nueva conexión)
      // Segunda llamada: tampoco se encuentra después de guardar (caso edge)
      mockRepository.findOne
        .mockResolvedValueOnce(Result.failure(new Error('Not found')))
        .mockResolvedValueOnce(Result.failure(new Error('Still not found')));

      mockRepository.save.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});