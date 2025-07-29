import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConnectionRepository } from '../domain/connection.repository';
import { ConnectionUser } from '../domain/connection-user';
import {
  Criteria,
  Filter,
  FilterGroup,
  Operator,
} from 'src/context/shared/domain/criteria';
import { err, ok, Result } from 'src/context/shared/domain/result';
import { ConnectionUserNotFound } from '../domain/errors/connection-user-not-found';
import { createClient, RedisClientType } from 'redis';

/**
 * Implementación de ConnectionRepository usando Redis como almacén de datos
 * Mantiene las conexiones de usuarios en Redis con patrones de clave optimizados
 */
@Injectable()
export class RedisConnectionService
  implements ConnectionRepository, OnModuleInit, OnModuleDestroy
{
  private redisClient: RedisClientType;

  // Patrones de claves para organizar los datos en Redis
  private readonly USER_SOCKET_KEY = 'user:socket:'; // user:socket:userId -> socketId
  private readonly SOCKET_USER_KEY = 'socket:user:'; // socket:user:socketId -> userId
  private readonly USER_ROLES_KEY = 'user:roles:'; // user:roles:userId -> JSON array of roles
  private readonly USER_COMPANY_KEY = 'user:company:'; // user:company:userId -> companyId
  private readonly ALL_USERS_KEY = 'users:all'; // Set con todos los userIds

  constructor() {
    // Configuración del cliente Redis
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    // Manejo de errores de conexión
    this.redisClient.on('error', (err) => {
      console.error('Error de conexión a Redis:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('Conectado a Redis exitosamente');
    });
  }

  async onModuleInit(): Promise<void> {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 segundos
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.redisClient.isOpen) {
          console.log(
            `Intentando conectar a Redis (intento ${attempt}/${maxRetries})...`,
          );
          await this.redisClient.connect();

          // Verificar que la conexión funciona correctamente
          await this.redisClient.ping();
          console.log('✅ Conexión a Redis establecida y verificada');
          return;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(
          `⚠️ Intento ${attempt}/${maxRetries} falló:`,
          lastError?.message || 'Error desconocido',
        );

        if (attempt < maxRetries) {
          console.log(`🔄 Reintentando en ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    console.error(
      '❌ Error al conectar con Redis después de todos los intentos:',
      lastError?.message || 'Error desconocido',
    );
    throw lastError || new Error('Redis connection failed after all retries');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redisClient.isOpen) {
        await this.redisClient.quit();
      }
    } catch (error) {
      console.error('Error al desconectar de Redis:', error);
    }
  }

  /**
   * Asegura que el cliente Redis esté conectado antes de realizar operaciones
   */
  private async ensureConnection(): Promise<void> {
    if (!this.redisClient.isOpen) {
      const maxRetries = 3;
      const retryDelay = 1000; // 1 segundo para operaciones internas
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `Reconectando a Redis (intento ${attempt}/${maxRetries})...`,
          );
          await this.redisClient.connect();
          await this.redisClient.ping();
          console.log('✅ Reconexión a Redis exitosa');
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(
            `⚠️ Intento de reconexión ${attempt}/${maxRetries} falló:`,
            lastError?.message || 'Error desconocido',
          );

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      console.error(
        '❌ Error al reconectar con Redis:',
        lastError?.message || 'Error desconocido',
      );
      throw lastError || new Error('Redis reconnection failed');
    }
  }

  /**
   * Guarda o actualiza un usuario en Redis
   * Mantiene múltiples índices para búsquedas eficientes
   */
  async save(user: ConnectionUser): Promise<void> {
    await this.ensureConnection();

    const { userId, roles, companyId } = user.toPrimitives();

    try {
      // Usar pipeline para operaciones atómicas
      const pipeline = this.redisClient.multi();

      // Agregar userId al conjunto de todos los usuarios
      pipeline.sAdd(this.ALL_USERS_KEY, userId);

      // Guardar roles del usuario
      pipeline.set(this.USER_ROLES_KEY + userId, JSON.stringify(roles));

      // Guardar companyId del usuario
      pipeline.set(
        this.USER_COMPANY_KEY + userId,
        companyId || '550e8400-e29b-41d4-a716-446655440000',
      );

      if (user.socketId.isPresent()) {
        const socketId = user.socketId.get().value;

        // Crear mapeo bidireccional usuario-socket
        pipeline.set(this.USER_SOCKET_KEY + userId, socketId);
        pipeline.set(this.SOCKET_USER_KEY + socketId, userId);
      } else {
        // Si no hay socketId, eliminar la conexión existente
        const existingSocketId = await this.redisClient.get(
          this.USER_SOCKET_KEY + userId,
        );
        if (existingSocketId) {
          pipeline.del(this.USER_SOCKET_KEY + userId);
          pipeline.del(this.SOCKET_USER_KEY + existingSocketId);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Error al guardar usuario en Redis:', error);
      throw error;
    }
  }

  /**
   * Elimina completamente un usuario de Redis
   */
  async remove(user: ConnectionUser): Promise<void> {
    await this.ensureConnection();

    const { userId } = user.toPrimitives();

    try {
      const pipeline = this.redisClient.multi();

      // Obtener socketId existente para limpieza
      const socketId = await this.redisClient.get(
        this.USER_SOCKET_KEY + userId,
      );

      // Eliminar de todos los índices
      pipeline.sRem(this.ALL_USERS_KEY, userId);
      pipeline.del(this.USER_ROLES_KEY + userId);
      pipeline.del(this.USER_COMPANY_KEY + userId);
      pipeline.del(this.USER_SOCKET_KEY + userId);

      if (socketId) {
        pipeline.del(this.SOCKET_USER_KEY + socketId);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Error al eliminar usuario de Redis:', error);
      throw error;
    }
  }

  /**
   * Busca un usuario por su ID específico
   */
  async findById(
    id: string,
  ): Promise<Result<ConnectionUser, ConnectionUserNotFound>> {
    await this.ensureConnection();

    try {
      // Verificar si el usuario existe en el conjunto de usuarios
      const userExists = await this.redisClient.sIsMember(
        this.ALL_USERS_KEY,
        id,
      );

      // log con todos los usuarios
      const allUsers = await this.redisClient.sMembers(this.ALL_USERS_KEY);
      console.log('Todos los usuarios en Redis:', allUsers);
      console.log(`Buscando usuario con ID: ${id}`);

      if (!userExists) {
        return err(new ConnectionUserNotFound());
      }

      // Reconstruir el usuario desde Redis
      const user = await this.buildUserFromRedis(id);

      if (!user) {
        return err(new ConnectionUserNotFound());
      }

      console.log(`Usuario encontrado: ${JSON.stringify(user.toPrimitives())}`);
      // Retornar el usuario encontrado

      return ok(user);
    } catch (error) {
      console.error('Error al buscar usuario por ID en Redis:', error);
      return err(new ConnectionUserNotFound());
    }
  }

  /**
   * Busca usuarios que cumplan con los criterios especificados
   */
  async find(criteria: Criteria<ConnectionUser>): Promise<ConnectionUser[]> {
    await this.ensureConnection();

    try {
      // Obtener todos los userIds registrados
      const userIds = await this.redisClient.sMembers(this.ALL_USERS_KEY);
      const users: ConnectionUser[] = [];

      // Procesar cada usuario y verificar si cumple los criterios
      for (const userId of userIds) {
        const user = await this.buildUserFromRedis(userId);
        if (user && this.matchesCriteria(user, criteria.filters)) {
          users.push(user);
        }
      }

      return users;
    } catch (error) {
      console.error('Error al buscar usuarios en Redis:', error);
      return [];
    }
  }

  /**
   * Busca el primer usuario que cumpla con los criterios
   */
  async findOne(
    criteria: Criteria<ConnectionUser>,
  ): Promise<Result<ConnectionUser, ConnectionUserNotFound>> {
    await this.ensureConnection();

    try {
      const userIds = await this.redisClient.sMembers(this.ALL_USERS_KEY);

      for (const userId of userIds) {
        const user = await this.buildUserFromRedis(userId);
        if (user && this.matchesCriteria(user, criteria.filters)) {
          return ok(user);
        }
      }

      return err(new ConnectionUserNotFound());
    } catch (error) {
      console.error('Error al buscar usuario en Redis:', error);
      return err(new ConnectionUserNotFound());
    }
  }

  /**
   * Reconstruye un ConnectionUser desde los datos almacenados en Redis
   */
  private async buildUserFromRedis(
    userId: string,
  ): Promise<ConnectionUser | null> {
    try {
      // Obtener roles, socketId y companyId del usuario
      const [rolesJson, socketId, companyId] = await Promise.all([
        this.redisClient.get(this.USER_ROLES_KEY + userId),
        this.redisClient.get(this.USER_SOCKET_KEY + userId),
        this.redisClient.get(this.USER_COMPANY_KEY + userId),
      ]);

      if (!rolesJson || !companyId) {
        return null; // Usuario no tiene datos válidos
      }

      const roles = JSON.parse(rolesJson) as string[];

      return ConnectionUser.fromPrimitives({
        userId,
        socketId: socketId || undefined,
        roles,
        companyId,
      });
    } catch (error) {
      console.error(
        `Error al reconstruir usuario ${userId} desde Redis:`,
        error,
      );
      return null;
    }
  }

  /**
   * Verifica si un usuario cumple con los filtros especificados
   */
  private matchesCriteria(
    user: ConnectionUser,
    filters: (Filter<ConnectionUser> | FilterGroup<ConnectionUser>)[],
  ): boolean {
    return filters.every((filter) => {
      if (filter instanceof FilterGroup) {
        if (filter.operator === 'AND') {
          return filter.filters.every((subFilter) =>
            this.matchesCriteria(user, [subFilter]),
          );
        } else if (filter.operator === 'OR') {
          return filter.filters.some((subFilter) =>
            this.matchesCriteria(user, [subFilter]),
          );
        }
        return false;
      }

      const { field, operator, value } = filter;
      switch (field) {
        case 'userId':
          return this.applyOperator(user.userId.value, operator, value);
        case 'socketId':
          if (user.socketId.isPresent()) {
            return this.applyOperator(
              user.socketId.get().value,
              operator,
              value,
            );
          }
          return operator === Operator.IS_NULL;
        case 'roles':
          return this.applyRoleOperator(user.roles, operator, value);
        case 'companyId':
          return this.applyOperator(user.companyId.value, operator, value);
        default:
          return false;
      }
    });
  }

  /**
   * Aplica operadores específicos para el campo de roles
   * Maneja la lógica de verificación de roles en arrays
   */
  private applyRoleOperator(
    userRoles: import('../domain/value-objects/connection-role').ConnectionRole[],
    operator: Operator,
    value: any,
  ): boolean {
    const rolesAsStrings = userRoles.map((role) => role.value);

    switch (operator) {
      case Operator.IN:
        // Verifica si alguno de los roles del usuario está en la lista de valores
        if (Array.isArray(value)) {
          return value.some((v: string) => rolesAsStrings.includes(v));
        }
        return rolesAsStrings.includes(value as string);
      case Operator.NOT_IN:
        // Verifica que ninguno de los roles del usuario esté en la lista de valores
        if (Array.isArray(value)) {
          return !value.some((v: string) => rolesAsStrings.includes(v));
        }
        return !rolesAsStrings.includes(value as string);
      case Operator.EQUALS:
        // Para roles, verificamos si contiene exactamente el rol especificado
        return rolesAsStrings.includes(value as string);
      default:
        return false;
    }
  }

  /**
   * Aplica operadores estándar para campos primitivos
   */
  private applyOperator(
    fieldValue: any,
    operator: Operator,
    value: any,
  ): boolean {
    switch (operator) {
      case Operator.EQUALS:
        return fieldValue === value;
      case Operator.NOT_EQUALS:
        return fieldValue !== value;
      case Operator.IN:
        return Array.isArray(value) && value.includes(fieldValue);
      case Operator.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);
      case Operator.IS_NULL:
        return fieldValue === null || fieldValue === undefined;
      case Operator.IS_NOT_NULL:
        return fieldValue !== null && fieldValue !== undefined;
      case Operator.LIKE:
        return (
          typeof fieldValue === 'string' &&
          typeof value === 'string' &&
          fieldValue.toLowerCase().includes(value.toLowerCase())
        );
      default:
        return false;
    }
  }
}
