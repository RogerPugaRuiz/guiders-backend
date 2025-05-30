import { ConnectionUser } from '../connection-user';
import { ConnectionUserId } from '../value-objects/connection-user-id';
import { ConnectionRole } from '../value-objects/connection-role';
import { ConnectionSocketId } from '../value-objects/connection-socket-id';
import { Optional } from 'src/context/shared/domain/optional';
import { ConnectedEvent } from '../events/connected.event';
import { DisconnectedEvent } from '../events/disconnected.event';
import { RealTimeMessageSendEvent } from '../events/real-time-message-send.event';

describe('ConnectionUser', () => {
  describe('create', () => {
    it('debería crear una nueva instancia con userId y roles', () => {
      // Arrange
      const userId = ConnectionUserId.create('user-123');
      const roles = [ConnectionRole.create('visitor')];

      // Act
      const connection = ConnectionUser.create({ userId, roles });

      // Assert
      expect(connection.userId).toBe(userId);
      expect(connection.roles).toEqual(roles);
      expect(connection.socketId.isEmpty()).toBe(true);
    });
  });

  describe('fromPrimitives', () => {
    it('debería crear una instancia desde primitivos sin socketId', () => {
      // Arrange
      const primitives = {
        userId: 'user-123',
        roles: ['visitor'],
      };

      // Act
      const connection = ConnectionUser.fromPrimitives(primitives);

      // Assert
      expect(connection.userId.value).toBe(primitives.userId);
      expect(connection.socketId.isEmpty()).toBe(true);
      expect(connection.roles[0].value).toBe(primitives.roles[0]);
    });

    it('debería crear una instancia desde primitivos con socketId', () => {
      // Arrange
      const primitives = {
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor', 'commercial'],
      };

      // Act
      const connection = ConnectionUser.fromPrimitives(primitives);

      // Assert
      expect(connection.userId.value).toBe(primitives.userId);
      expect(connection.socketId.isPresent()).toBe(true);
      expect(connection.socketId.get().value).toBe(primitives.socketId);
      expect(connection.roles.length).toBe(2);
      expect(connection.roles[0].value).toBe(primitives.roles[0]);
      expect(connection.roles[1].value).toBe(primitives.roles[1]);
    });
  });

  describe('isSameUser', () => {
    it('debería retornar true si es el mismo userId', () => {
      // Arrange
      const userId = 'user-123';
      const connection = ConnectionUser.fromPrimitives({
        userId,
        roles: ['visitor'],
      });

      // Act
      const result = connection.isSameUser(ConnectionUserId.create(userId));

      // Assert
      expect(result).toBe(true);
    });

    it('debería retornar false si no es el mismo userId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });

      // Act
      const result = connection.isSameUser(ConnectionUserId.create('user-456'));

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isConnected y isDisconnected', () => {
    it('debería retornar true para isConnected si tiene socketId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor'],
      });

      // Act & Assert
      expect(connection.isConnected()).toBe(true);
      expect(connection.isDisconnected()).toBe(false);
    });

    it('debería retornar true para isDisconnected si no tiene socketId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });

      // Act & Assert
      expect(connection.isConnected()).toBe(false);
      expect(connection.isDisconnected()).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('debería retornar true si tiene el rol (string)', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor', 'commercial'],
      });

      // Act & Assert
      expect(connection.hasRole('visitor')).toBe(true);
      expect(connection.hasRole('commercial')).toBe(true);
      expect(connection.hasRole('admin')).toBe(false);
    });

    it('debería retornar true si tiene el rol (ConnectionRole)', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });
      const visitorRole = ConnectionRole.create('visitor');
      const adminRole = ConnectionRole.create('admin');

      // Act & Assert
      expect(connection.hasRole(visitorRole)).toBe(true);
      expect(connection.hasRole(adminRole)).toBe(false);
    });
  });

  describe('ifConnected e ifDisconnected', () => {
    it('debería ejecutar el callback si está conectado', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor'],
      });
      const callback = jest.fn();

      // Act
      connection.ifConnected(callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(connection);
    });

    it('no debería ejecutar el callback si no está conectado', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });
      const callback = jest.fn();

      // Act
      connection.ifConnected(callback);

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('debería ejecutar el callback si está desconectado', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });
      const callback = jest.fn();

      // Act
      connection.ifDisconnected(callback);

      // Assert
      expect(callback).toHaveBeenCalledWith(connection);
    });

    it('no debería ejecutar el callback si no está desconectado', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor'],
      });
      const callback = jest.fn();

      // Act
      connection.ifDisconnected(callback);

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('toPrimitives', () => {
    it('debería convertir a primitivos sin socketId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });

      // Act
      const primitives = connection.toPrimitives();

      // Assert
      expect(primitives.userId).toBe('user-123');
      expect(primitives.socketId).toBeNull();
      expect(primitives.roles).toEqual(['visitor']);
    });

    it('debería convertir a primitivos con socketId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor'],
      });

      // Act
      const primitives = connection.toPrimitives();

      // Assert
      expect(primitives.userId).toBe('user-123');
      expect(primitives.socketId).toBe('socket-123');
      expect(primitives.roles).toEqual(['visitor']);
    });
  });

  describe('updateRole', () => {
    it('debería actualizar los roles', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });
      const newRoles = [ConnectionRole.create('commercial')];

      // Act
      const updatedConnection = connection.updateRole(newRoles);

      // Assert
      expect(updatedConnection.roles).toEqual(newRoles);
      expect(updatedConnection.userId).toBe(connection.userId);
      expect(updatedConnection.socketId).toBe(connection.socketId);
    });
  });

  describe('connect', () => {
    it('debería crear una conexión con socketId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        roles: ['visitor'],
      });
      const socketId = ConnectionSocketId.create('socket-123');

      // Act
      const connectedConnection = connection.connect(socketId);

      // Assert
      expect(connectedConnection.socketId.isPresent()).toBe(true);
      expect(connectedConnection.socketId.get()).toBe(socketId);
    });
  });

  describe('disconnect', () => {
    it('debería crear una conexión sin socketId', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor'],
      });

      // Act
      const disconnectedConnection = connection.disconnect();

      // Assert
      expect(disconnectedConnection.socketId.isEmpty()).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('debería devolver la misma instancia', () => {
      // Arrange
      const connection = ConnectionUser.fromPrimitives({
        userId: 'user-123',
        socketId: 'socket-123',
        roles: ['visitor'],
      });
      const receiver = ConnectionUser.fromPrimitives({
        userId: 'user-456',
        socketId: 'socket-456',
        roles: ['commercial'],
      });
      const message = 'Hola';
      const timestamp = new Date();

      // Mockear console.log para evitar logs en los tests
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      // Act
      const result = connection.sendMessage({
        toUser: receiver,
        message,
        timestamp,
      });

      // Restore console.log
      console.log = originalConsoleLog;

      // Assert
      expect(result).toBe(connection);
    });
  });
});