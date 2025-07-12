/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
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

  // Función para generar IDs únicos por test
  const generateUniqueId = () =>
    `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const generateUniqueCompanyId = (): string => {
    // Generar un UUID válido usando crypto para asegurar unicidad
    return randomUUID();
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [RedisConnectionService],
    }).compile();

    service = module.get<RedisConnectionService>(RedisConnectionService);

    try {
      // Asegurar que el servicio esté conectado antes de los tests
      await service.onModuleInit();
      // Limpiar completamente Redis antes de cada test
      await service['redis'].flushall();
      // Pequeño delay para asegurar que la limpieza se complete
      await new Promise((resolve) => setTimeout(resolve, 100));
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
      // Limpiar completamente Redis para evitar datos residuales
      await service['redis'].flushall();
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
      // Arrange - IDs únicos para este test
      const uniqueUserId = generateUniqueId();
      const uniqueSocketId = `socket-${Date.now()}`;
      const uniqueCompanyId = generateUniqueCompanyId();

      const userId = ConnectionUserId.create(uniqueUserId);
      const socketId = ConnectionSocketId.create(uniqueSocketId);
      const roles = [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(uniqueCompanyId),
      }).connect(socketId);

      try {
        // Act
        await service.save(user);

        // Buscar usuarios con rol commercial Y la companyId específica para aislamiento
        const criteria = new Criteria<ConnectionUser>()
          .addFilter('roles', Operator.EQUALS, ConnectionRole.COMMERCIAL)
          .addFilter('companyId', Operator.EQUALS, uniqueCompanyId);

        const result = await service.find(criteria);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].userId.value).toBe(uniqueUserId);
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
      // Arrange - IDs únicos para este test
      const uniqueUserId = generateUniqueId();
      const uniqueSocketId = `socket-${Date.now()}`;
      const uniqueCompanyId = generateUniqueCompanyId();

      const userId = ConnectionUserId.create(uniqueUserId);
      const socketId = ConnectionSocketId.create(uniqueSocketId);
      const roles = [
        new ConnectionRole(ConnectionRoleEnum.COMMERCIAL),
        new ConnectionRole(ConnectionRoleEnum.ADMIN),
      ];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(uniqueCompanyId),
      }).connect(socketId);

      try {
        // Act
        await service.save(user);

        // Buscar usuarios con rol commercial Y la companyId específica para aislamiento
        const criteria = new Criteria<ConnectionUser>()
          .addFilter('roles', Operator.EQUALS, ConnectionRole.COMMERCIAL)
          .addFilter('companyId', Operator.EQUALS, uniqueCompanyId);

        const result = await service.find(criteria);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].userId.value).toBe(uniqueUserId);
        expect(result[0].hasRole('commercial')).toBe(true);
        expect(result[0].hasRole('admin')).toBe(true);
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
      // Arrange - IDs únicos para este test
      const uniqueUserId = generateUniqueId();
      const uniqueSocketId = `socket-${Date.now()}`;
      const uniqueCompanyId = generateUniqueCompanyId();

      const userId = ConnectionUserId.create(uniqueUserId);
      const socketId = ConnectionSocketId.create(uniqueSocketId);
      const roles = [new ConnectionRole(ConnectionRoleEnum.VISITOR)];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(uniqueCompanyId),
      }).connect(socketId);

      try {
        // Act
        await service.save(user);

        // Buscar usuarios con rol commercial en esta companyId específica
        const criteria = new Criteria<ConnectionUser>()
          .addFilter('roles', Operator.EQUALS, ConnectionRole.COMMERCIAL)
          .addFilter('companyId', Operator.EQUALS, uniqueCompanyId);

        const result = await service.find(criteria);

        // Assert - no debe encontrar usuarios que solo tienen rol visitor
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

  describe('remove operations', () => {
    it('should remove user from Redis', async () => {
      // Arrange - IDs únicos para este test
      const uniqueUserId = generateUniqueId();
      const uniqueSocketId = `socket-${Date.now()}`;
      const uniqueCompanyId = generateUniqueCompanyId();

      const userId = ConnectionUserId.create(uniqueUserId);
      const socketId = ConnectionSocketId.create(uniqueSocketId);
      const roles = [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)];

      const user = ConnectionUser.create({
        userId,
        roles,
        companyId: ConnectionCompanyId.create(uniqueCompanyId),
      }).connect(socketId);

      try {
        // Act - guardar y luego eliminar
        await service.save(user);
        await service.remove(user);

        // Verificar que el usuario fue eliminado
        const criteria = new Criteria<ConnectionUser>()
          .addFilter('userId', Operator.EQUALS, uniqueUserId)
          .addFilter('companyId', Operator.EQUALS, uniqueCompanyId);

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
      // Arrange - IDs únicos para este test
      const testCompanyId1 = generateUniqueCompanyId();
      const testCompanyId2 = generateUniqueCompanyId();

      const user1 = ConnectionUser.create({
        userId: ConnectionUserId.create(generateUniqueId()),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId1),
      }).connect(ConnectionSocketId.create(`socket-${Date.now()}`));

      // Delay para asegurar timestamps únicos
      await new Promise((resolve) => setTimeout(resolve, 10));

      const user2 = ConnectionUser.create({
        userId: ConnectionUserId.create(generateUniqueId()),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId2),
      }).connect(ConnectionSocketId.create(`socket-${Date.now()}-2`));

      try {
        // Act - Guardar usuarios de diferentes compañías
        await service.save(user1);
        
        // Delay para asegurar que los saves sean secuenciales
        await new Promise((resolve) => setTimeout(resolve, 10));
        
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
        expect(result[0].userId.value).toBe(user1.userId.value);
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
      // Arrange - IDs únicos para este test
      const testCompanyId = generateUniqueCompanyId();

      const commercial = ConnectionUser.create({
        userId: ConnectionUserId.create(generateUniqueId()),
        roles: [new ConnectionRole(ConnectionRoleEnum.COMMERCIAL)],
        companyId: ConnectionCompanyId.create(testCompanyId),
      }).connect(ConnectionSocketId.create(`socket-${Date.now()}`));

      const visitor = ConnectionUser.create({
        userId: ConnectionUserId.create(generateUniqueId()),
        roles: [new ConnectionRole(ConnectionRoleEnum.VISITOR)],
        companyId: ConnectionCompanyId.create(testCompanyId),
      }).connect(ConnectionSocketId.create(`socket-${Date.now()}-2`));

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
        expect(result[0].userId.value).toBe(commercial.userId.value);
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
