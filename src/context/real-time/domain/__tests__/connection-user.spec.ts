import { ConnectionUser } from '../connection-user';
import { ConnectionUserId } from '../value-objects/connection-user-id';
import { ConnectionRole } from '../value-objects/connection-role';
import { ConnectionCompanyId } from '../value-objects/connection-company-id';
import { ConnectionSocketId } from '../value-objects/connection-socket-id';

describe('ConnectionUser', () => {
  const validUserId = 'user-123';
  const validCompanyId = '550e8400-e29b-41d4-a716-446655440000';
  const validRoles = ['visitor'];
  const validSocketId = 'socket-456';

  describe('create', () => {
    it('debe crear ConnectionUser con parámetros válidos', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      });

      expect(connectionUser).toBeDefined();
      expect(connectionUser.userId.value).toBe(validUserId);
      expect(connectionUser.companyId.value).toBe(validCompanyId);
      expect(connectionUser.roles).toHaveLength(1);
      expect(connectionUser.roles[0].value).toBe('visitor');
      expect(connectionUser.isDisconnected()).toBe(true);
    });
  });

  describe('fromPrimitives', () => {
    it('debe crear ConnectionUser desde primitivos incluyendo companyId', () => {
      const primitives = {
        userId: validUserId,
        socketId: validSocketId,
        roles: validRoles,
        companyId: validCompanyId,
      };

      const connectionUser = ConnectionUser.fromPrimitives(primitives);

      expect(connectionUser).toBeDefined();
      expect(connectionUser.userId.value).toBe(validUserId);
      expect(connectionUser.companyId.value).toBe(validCompanyId);
      expect(connectionUser.roles[0].value).toBe('visitor');
      expect(connectionUser.isConnected()).toBe(true);
    });

    it('debe crear ConnectionUser desde primitivos sin socketId', () => {
      const primitives = {
        userId: validUserId,
        roles: validRoles,
        companyId: validCompanyId,
      };

      const connectionUser = ConnectionUser.fromPrimitives(primitives);

      expect(connectionUser).toBeDefined();
      expect(connectionUser.userId.value).toBe(validUserId);
      expect(connectionUser.companyId.value).toBe(validCompanyId);
      expect(connectionUser.isDisconnected()).toBe(true);
    });
  });

  describe('toPrimitives', () => {
    it('debe convertir ConnectionUser a primitivos incluyendo companyId', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      });

      const primitives = connectionUser.toPrimitives();

      expect(primitives).toEqual({
        userId: validUserId,
        socketId: null,
        roles: validRoles,
        companyId: validCompanyId,
      });
    });

    it('debe incluir socketId cuando está conectado', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      }).connect(ConnectionSocketId.create(validSocketId));

      const primitives = connectionUser.toPrimitives();

      expect(primitives).toEqual({
        userId: validUserId,
        socketId: validSocketId,
        roles: validRoles,
        companyId: validCompanyId,
      });
    });
  });

  describe('connect', () => {
    it('debe mantener companyId al conectar', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      });

      const connectedUser = connectionUser.connect(
        ConnectionSocketId.create(validSocketId),
      );

      expect(connectedUser.companyId.value).toBe(validCompanyId);
      expect(connectedUser.isConnected()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('debe mantener companyId al desconectar', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      }).connect(ConnectionSocketId.create(validSocketId));

      const disconnectedUser = connectionUser.disconnect();

      expect(disconnectedUser.companyId.value).toBe(validCompanyId);
      expect(disconnectedUser.isDisconnected()).toBe(true);
    });
  });

  describe('updateRole', () => {
    it('debe mantener companyId al actualizar roles', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      });

      const newRoles = ['commercial', 'admin'].map((role) =>
        ConnectionRole.create(role),
      );
      const updatedUser = connectionUser.updateRole(newRoles);

      expect(updatedUser.companyId.value).toBe(validCompanyId);
      expect(updatedUser.roles).toHaveLength(2);
      expect(updatedUser.hasRole('commercial')).toBe(true);
      expect(updatedUser.hasRole('admin')).toBe(true);
    });
  });

  describe('companyId integration', () => {
    it('debe validar companyId con UUID válido', () => {
      expect(() => {
        ConnectionUser.create({
          userId: ConnectionUserId.create(validUserId),
          roles: validRoles.map((role) => ConnectionRole.create(role)),
          companyId: ConnectionCompanyId.create(validCompanyId),
        });
      }).not.toThrow();
    });

    it('debe fallar con companyId inválido', () => {
      expect(() => {
        ConnectionCompanyId.create('invalid-uuid');
      }).toThrow('El companyId debe ser un UUID válido');
    });

    it('debe mantener consistencia de companyId a través de operaciones', () => {
      const connectionUser = ConnectionUser.create({
        userId: ConnectionUserId.create(validUserId),
        roles: validRoles.map((role) => ConnectionRole.create(role)),
        companyId: ConnectionCompanyId.create(validCompanyId),
      });

      // Conectar, desconectar y actualizar roles
      const connected = connectionUser.connect(
        ConnectionSocketId.create(validSocketId),
      );
      const disconnected = connected.disconnect();
      const updated = disconnected.updateRole([ConnectionRole.create('admin')]);

      // CompanyId debe mantenerse consistente
      expect(connectionUser.companyId.value).toBe(validCompanyId);
      expect(connected.companyId.value).toBe(validCompanyId);
      expect(disconnected.companyId.value).toBe(validCompanyId);
      expect(updated.companyId.value).toBe(validCompanyId);
    });
  });
});
