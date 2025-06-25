import { InMemoryConnectionService } from '../in-memory-connection.service';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionUserId } from '../../domain/value-objects/connection-user-id';
import {
  ConnectionRole,
  ConnectionRoleEnum,
} from '../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../domain/value-objects/connection-socket-id';
import { ConnectionCompanyId } from '../../domain/value-objects/connection-company-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

describe('InMemoryConnectionService', () => {
  let service: InMemoryConnectionService;

  beforeEach(() => {
    service = new InMemoryConnectionService();
  });

  describe('companyId filtering', () => {
    it('should filter users by companyId', async () => {
      // Arrange
      const testCompanyId1 = '123e4567-e89b-12d3-a456-426614174000';
      const testCompanyId2 = '123e4567-e89b-12d3-a456-426614174001';

      const user1 = ConnectionUser.create({
        userId: ConnectionUserId.create('test-user-company-1'),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId1),
      }).connect(ConnectionSocketId.create('socket-company-1'));

      const user2 = ConnectionUser.create({
        userId: ConnectionUserId.create('test-user-company-2'),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId2),
      }).connect(ConnectionSocketId.create('socket-company-2'));

      // Act - Guardar usuarios de diferentes compañías
      await service.save(user1);
      await service.save(user2);

      // Buscar usuarios por companyId específico
      const criteria = new Criteria<ConnectionUser>().addFilter(
        'companyId',
        Operator.EQUALS,
        testCompanyId1,
      );

      const result = await service.find(criteria);

      // Assert - Solo debe encontrar el usuario de la compañía especificada
      expect(result).toHaveLength(1);
      expect(result[0].userId.value).toBe('test-user-company-1');
      expect(result[0].companyId.value).toBe(testCompanyId1);
    });

    it('should combine companyId and role filters', async () => {
      // Arrange
      const testCompanyId = '123e4567-e89b-12d3-a456-426614174000';

      const commercial = ConnectionUser.create({
        userId: ConnectionUserId.create('test-commercial-company'),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId),
      }).connect(ConnectionSocketId.create('socket-commercial-company'));

      const visitor = ConnectionUser.create({
        userId: ConnectionUserId.create('test-visitor-company'),
        roles: [new ConnectionRole(ConnectionRoleEnum.VISITOR)],
        companyId: ConnectionCompanyId.create(testCompanyId),
      }).connect(ConnectionSocketId.create('socket-visitor-company'));

      // Act - Guardar usuarios de la misma compañía pero diferentes roles
      await service.save(commercial);
      await service.save(visitor);

      // Buscar solo comerciales de la compañía específica
      const criteria = new Criteria<ConnectionUser>()
        .addFilter('companyId', Operator.EQUALS, testCompanyId)
        .addFilter('roles', Operator.EQUALS, ConnectionRole.COMMERCIAL);

      const result = await service.find(criteria);

      // Assert - Solo debe encontrar el comercial de la compañía
      expect(result).toHaveLength(1);
      expect(result[0].userId.value).toBe('test-commercial-company');
      expect(result[0].hasRole('commercial')).toBe(true);
      expect(result[0].companyId.value).toBe(testCompanyId);
    });

    it('should return empty array when no users match companyId', async () => {
      // Arrange
      const testCompanyId = '123e4567-e89b-12d3-a456-426614174000';
      const differentCompanyId = '123e4567-e89b-12d3-a456-426614174001';

      const user = ConnectionUser.create({
        userId: ConnectionUserId.create('test-user'),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId),
      });

      // Act - Guardar usuario con una companyId
      await service.save(user);

      // Buscar con una companyId diferente
      const criteria = new Criteria<ConnectionUser>().addFilter(
        'companyId',
        Operator.EQUALS,
        differentCompanyId,
      );

      const result = await service.find(criteria);

      // Assert - No debe encontrar usuarios
      expect(result).toHaveLength(0);
    });

    it('should support findOne with companyId filter', async () => {
      // Arrange
      const testCompanyId = '123e4567-e89b-12d3-a456-426614174000';

      const user = ConnectionUser.create({
        userId: ConnectionUserId.create('test-user-findone'),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId),
      }).connect(ConnectionSocketId.create('socket-findone'));

      // Act - Guardar usuario
      await service.save(user);

      // Buscar usuario específico por companyId
      const criteria = new Criteria<ConnectionUser>().addFilter(
        'companyId',
        Operator.EQUALS,
        testCompanyId,
      );

      const result = await service.findOne(criteria);

      // Assert - Debe encontrar el usuario
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId.value).toBe('test-user-findone');
        expect(result.value.companyId.value).toBe(testCompanyId);
      }
    });
  });
});
