/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { RedisConnectionService } from '../redis-connection.service';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionUserId } from '../../domain/value-objects/connection-user-id';
import {
  ConnectionRole,
  ConnectionRoleEnum,
} from '../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../domain/value-objects/connection-socket-id';
import { ConnectionCompanyId } from '../../domain/value-objects/connection-company-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

describe('RedisConnectionService', () => {
  let service: RedisConnectionService;
  let module: TestingModule;

  // Constante para testing
  const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [RedisConnectionService],
    }).compile();

    service = module.get<RedisConnectionService>(RedisConnectionService);

    try {
      // Asegurar que el servicio esté conectado antes de los tests
      await service.onModuleInit();
    } catch (error) {
      // Si Redis no está disponible, marcar tests como pendientes
      if (
        error.message.includes('Redis') ||
        error.message.includes('ECONNREFUSED')
      ) {
        console.warn('Redis no está disponible para testing, saltando tests');
      }
    }
  });

  afterEach(async () => {
    // Limpiar datos después de cada test
    try {
      // Primero buscar todos los usuarios con rol commercial y visitor para limpiarlos
      const commercialCriteria = new Criteria<ConnectionUser>().addFilter(
        'roles',
        Operator.EQUALS,
        ConnectionRole.COMMERCIAL,
      );
      const visitorCriteria = new Criteria<ConnectionUser>().addFilter(
        'roles',
        Operator.EQUALS,
        ConnectionRole.VISITOR,
      );

      const commercialUsers = await service.find(commercialCriteria);
      const visitorUsers = await service.find(visitorCriteria);

      // Remover todos los usuarios encontrados
      for (const user of [...commercialUsers, ...visitorUsers]) {
        await service.remove(user);
      }

      // También limpiar IDs específicos de test
      const testUserIds = [
        'test-user-1',
        'test-user-2',
        'test-user-3',
        'test-user-remove',
        'ffcb698d-60e9-46bf-8747-1c700f498519', // ID que aparece en el error
      ];
      for (const userId of testUserIds) {
        const testUser = ConnectionUser.create({
          userId: ConnectionUserId.create(userId),
          roles: [new ConnectionRole(ConnectionRoleEnum.VISITOR)],
          companyId: ConnectionCompanyId.create(TEST_COMPANY_ID),
        });
        await service.remove(testUser);
      }
    } catch {
      // Ignorar errores de limpieza en tests
    }
  });

  afterAll(async () => {
    // Solo cerrar el módulo al final de todos los tests
    if (module) {
      await module.close();
    }
  });

  describe('save and find operations', () => {
    it('should save and retrieve a user with commercial role', async () => {
      // Arrange
      const userId = ConnectionUserId.create('test-user-1');
      const socketId = ConnectionSocketId.create('socket-123');
      const roles = [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(TEST_COMPANY_ID),
      }).connect(socketId);

      try {
        // Act
        await service.save(user);

        // Buscar usuarios con rol commercial
        const criteria = new Criteria<ConnectionUser>().addFilter(
          'roles',
          Operator.EQUALS,
          ConnectionRole.COMMERCIAL,
        );

        const result = await service.find(criteria);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].userId.value).toBe('test-user-1');
        expect(result[0].hasRole('commercial')).toBe(true);
        expect(result[0].isConnected()).toBe(true);
      } catch (error) {
        // Si no hay conexión a Redis, marcar test como pendiente
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
    });

    it('should find users with multiple roles including commercial', async () => {
      // Arrange
      const userId = ConnectionUserId.create('test-user-2');
      const socketId = ConnectionSocketId.create('socket-456');
      const roles = [
        new ConnectionRole(ConnectionRoleEnum.COMMERCIAL),
        new ConnectionRole(ConnectionRoleEnum.ADMIN),
      ];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(TEST_COMPANY_ID),
      }).connect(socketId);

      try {
        // Act
        await service.save(user);

        // Buscar usuarios con rol commercial (debe encontrar también usuarios con múltiples roles)
        const criteria = new Criteria<ConnectionUser>().addFilter(
          'roles',
          Operator.EQUALS,
          ConnectionRole.COMMERCIAL,
        );

        const result = await service.find(criteria);

        // Assert
        expect(result.length).toBeGreaterThanOrEqual(1);
        const foundUser = result.find((u) => u.userId.value === 'test-user-2');
        expect(foundUser).toBeDefined();
        expect(foundUser!.hasRole('commercial')).toBe(true);
        expect(foundUser!.hasRole('admin')).toBe(true);
      } catch (error) {
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
    });

    it('should not find users without commercial role', async () => {
      // Arrange
      const userId = ConnectionUserId.create('test-user-3');
      const socketId = ConnectionSocketId.create('socket-789');
      const roles = [new ConnectionRole(ConnectionRoleEnum.VISITOR)];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(TEST_COMPANY_ID),
      }).connect(socketId);

      try {
        // Act
        await service.save(user);

        // Buscar usuarios con rol commercial (no debe encontrar visitantes)
        const criteria = new Criteria<ConnectionUser>().addFilter(
          'roles',
          Operator.EQUALS,
          ConnectionRole.COMMERCIAL,
        );

        const result = await service.find(criteria);

        // Assert - no debe encontrar usuarios que solo tienen rol visitor
        const foundUser = result.find((u) => u.userId.value === 'test-user-3');
        expect(foundUser).toBeUndefined();
      } catch (error) {
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
    });
  });

  describe('remove operations', () => {
    it('should remove user from Redis', async () => {
      // Arrange
      const userId = ConnectionUserId.create('test-user-remove');
      const socketId = ConnectionSocketId.create('socket-remove');
      const roles = [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(TEST_COMPANY_ID),
      }).connect(socketId);

      try {
        // Act - guardar y luego eliminar
        await service.save(user);
        await service.remove(user);

        // Verificar que el usuario fue eliminado
        const criteria = new Criteria<ConnectionUser>().addFilter(
          'userId',
          Operator.EQUALS,
          'test-user-remove',
        );

        const result = await service.find(criteria);

        // Assert
        expect(result).toHaveLength(0);
      } catch (error) {
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
    });
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

      try {
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
      } catch (error) {
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
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

      try {
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
      } catch (error) {
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
    });
  });

  describe('module lifecycle', () => {
    it('should initialize Redis connection', async () => {
      try {
        // Act
        await service.onModuleInit();

        // Assert - si no hay excepción, la conexión fue exitosa
        expect(true).toBe(true);
      } catch (error) {
        if (
          error.message.includes('Redis') ||
          error.message.includes('ECONNREFUSED')
        ) {
          pending('Redis no está disponible para testing');
        }
        throw error;
      }
    });
  });
});
