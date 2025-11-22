import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VisitorV2Repository,
  PaginatedVisitorsResult,
  VisitorSearchFilters,
  VisitorSearchSort,
  VisitorSearchPagination,
  VisitorSearchResult,
} from '../../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { VisitorFingerprint } from '../../../domain/value-objects/visitor-fingerprint';
import { SessionId } from '../../../domain/value-objects/session-id';
import { Result, ok, err, okVoid } from '../../../../shared/domain/result';
import { DomainError } from '../../../../shared/domain/domain.error';
import { VisitorV2MongoEntity } from '../entity/visitor-v2-mongo.entity';
import { VisitorV2Mapper } from '../mappers/visitor-v2.mapper';

/**
 * Error específico para problemas de persistencia de visitantes
 */
export class VisitorV2PersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class VisitorV2MongoRepositoryImpl implements VisitorV2Repository {
  private readonly logger = new Logger(VisitorV2MongoRepositoryImpl.name);

  constructor(
    @InjectModel(VisitorV2MongoEntity.name)
    private readonly visitorModel: Model<VisitorV2MongoEntity>,
  ) {}

  async save(visitor: VisitorV2): Promise<Result<void, DomainError>> {
    try {
      const persistenceEntity = VisitorV2Mapper.toPersistence(visitor);

      this.logger.log(
        `💾 Guardando visitante: ID=${persistenceEntity.id}, fingerprint=${persistenceEntity.fingerprint}, siteId=${persistenceEntity.siteId}`,
      );

      // Verificar si el visitante ya existe
      const existingVisitor = await this.visitorModel.findOne({
        id: persistenceEntity.id,
      });

      if (existingVisitor) {
        this.logger.log(
          `🔄 Visitante existente encontrado, actualizando: ${persistenceEntity.id}`,
        );

        // Visitante existente: hacer merge de sesiones para preservar historial
        const existingSessions = existingVisitor.sessions || [];
        const newSessions = persistenceEntity.sessions || [];

        this.logger.log(`   - Sesiones existentes: ${existingSessions.length}`);
        this.logger.log(`   - Sesiones nuevas: ${newSessions.length}`);

        // Crear un mapa de sesiones existentes por ID para evitar duplicados
        const existingSessionsMap = new Map(
          existingSessions.map((session) => [session.id, session]),
        );

        // Añadir solo las sesiones nuevas (que no existen ya)
        const mergedSessions = [...existingSessions];
        newSessions.forEach((newSession) => {
          if (!existingSessionsMap.has(newSession.id)) {
            mergedSessions.push(newSession);
            this.logger.log(`   + Nueva sesión agregada: ${newSession.id}`);
          } else {
            // Actualizar sesión existente (para casos como heartbeat)
            const existingIndex = mergedSessions.findIndex(
              (s) => s.id === newSession.id,
            );
            if (existingIndex !== -1) {
              mergedSessions[existingIndex] = newSession;
              this.logger.log(`   ~ Sesión actualizada: ${newSession.id}`);
            }
          }
        });

        // Actualizar con sesiones preservadas
        await this.visitorModel.findOneAndUpdate(
          { id: persistenceEntity.id },
          {
            ...persistenceEntity,
            sessions: mergedSessions,
          },
          { new: true },
        );

        this.logger.log(
          `✅ Visitante actualizado con ${mergedSessions.length} sesiones totales`,
        );
      } else {
        this.logger.log(`🆕 Visitante nuevo, creando: ${persistenceEntity.id}`);

        // Visitante nuevo: crear con upsert
        await this.visitorModel.findOneAndUpdate(
          { id: persistenceEntity.id },
          persistenceEntity,
          { upsert: true, new: true },
        );

        this.logger.log(`✅ Visitante creado exitosamente`);
      }

      this.logger.log(`💾 Visitante guardado: ${persistenceEntity.id}`);
      return okVoid();
    } catch (error) {
      const errorMessage = `Error al guardar visitante: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findById(id: VisitorId): Promise<Result<VisitorV2, DomainError>> {
    try {
      const entity = await this.visitorModel.findOne({ id: id.value });

      if (!entity) {
        return err(
          new VisitorV2PersistenceError(`Visitante no encontrado: ${id.value}`),
        );
      }

      const visitor = VisitorV2Mapper.fromPersistence(entity);
      return ok(visitor);
    } catch (error) {
      const errorMessage = `Error al buscar visitante por ID: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findByFingerprintAndSite(
    fingerprint: VisitorFingerprint,
    siteId: SiteId,
  ): Promise<Result<VisitorV2, DomainError>> {
    try {
      const query = {
        fingerprint: fingerprint.value,
        siteId: siteId.value,
      };

      this.logger.log(
        `🔍 Buscando visitante en DB con query: ${JSON.stringify(query)}`,
      );

      const entity = await this.visitorModel.findOne(query);

      if (!entity) {
        this.logger.log(
          `❌ No se encontró visitante con fingerprint: ${fingerprint.value} y siteId: ${siteId.value}`,
        );

        // Verificar si existen visitantes con este fingerprint en otros sitios
        const allWithFingerprint = await this.visitorModel.find({
          fingerprint: fingerprint.value,
        });
        this.logger.log(
          `🔍 Visitantes con este fingerprint en otros sitios: ${allWithFingerprint.length}`,
        );
        allWithFingerprint.forEach((v) => {
          this.logger.log(
            `   - ID: ${v.id}, siteId: ${v.siteId}, fingerprint: ${v.fingerprint}`,
          );
        });

        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado con fingerprint: ${fingerprint.value} y siteId: ${siteId.value}`,
          ),
        );
      }

      this.logger.log(
        `✅ Visitante encontrado: ID=${entity.id}, fingerprint=${entity.fingerprint}, siteId=${entity.siteId}`,
      );

      const visitor = VisitorV2Mapper.fromPersistence(entity);
      return ok(visitor);
    } catch (error) {
      const errorMessage = `Error al buscar visitante por fingerprint y site: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findBySessionId(
    sessionId: SessionId,
  ): Promise<Result<VisitorV2, DomainError>> {
    try {
      const query = { 'sessions.id': sessionId.value };
      this.logger.debug(`🔍 MongoDB query: ${JSON.stringify(query)}`);
      this.logger.debug(`🔍 Buscando sessionId: ${sessionId.value}`);

      const entity = await this.visitorModel.findOne(query);
      this.logger.debug(
        `🔍 MongoDB resultado: ${entity ? 'ENCONTRADO' : 'NO ENCONTRADO'}`,
      );

      if (!entity) {
        this.logger.warn(
          `❌ Visitante no encontrado con sessionId: ${sessionId.value}`,
        );
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado con sessionId: ${sessionId.value}`,
          ),
        );
      }

      this.logger.debug(`✅ Entidad encontrada: ${String(entity._id)}`);
      const visitor = VisitorV2Mapper.fromPersistence(entity);
      return ok(visitor);
    } catch (error) {
      const errorMessage = `Error al buscar visitante por sessionId: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findBySiteId(
    siteId: SiteId,
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const entities = await this.visitorModel.find({ siteId: siteId.value });

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );
      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar visitantes por siteId: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findByTenantId(
    tenantId: TenantId,
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const entities = await this.visitorModel.find({
        tenantId: tenantId.value,
      });

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );
      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar visitantes por tenantId: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async delete(id: VisitorId): Promise<Result<void, DomainError>> {
    try {
      const result = await this.visitorModel.deleteOne({ id: id.value });

      if (result.deletedCount === 0) {
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado para eliminar: ${id.value}`,
          ),
        );
      }

      this.logger.log(`Visitante eliminado: ${id.value}`);
      return okVoid();
    } catch (error) {
      const errorMessage = `Error al eliminar visitante: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findAll(): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const entities = await this.visitorModel.find();

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );
      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar todos los visitantes: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async update(visitor: VisitorV2): Promise<Result<void, DomainError>> {
    try {
      const persistenceEntity = VisitorV2Mapper.toPersistence(visitor);

      const result = await this.visitorModel.updateOne(
        { id: persistenceEntity.id },
        persistenceEntity,
      );

      if (result.matchedCount === 0) {
        return err(
          new VisitorV2PersistenceError(
            `Visitante no encontrado para actualizar: ${persistenceEntity.id}`,
          ),
        );
      }

      this.logger.log(`Visitante actualizado: ${persistenceEntity.id}`);
      return okVoid();
    } catch (error) {
      const errorMessage = `Error al actualizar visitante: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findWithActiveSessions(options?: {
    tenantId?: TenantId;
    limit?: number;
  }): Promise<Result<VisitorV2[], DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        // Buscar visitantes que tienen al menos una sesión sin endedAt
        'sessions.0': { $exists: true }, // Tiene al menos una sesión
        sessions: {
          $elemMatch: {
            // Sesión activa: endedAt es null o no existe
            $or: [{ endedAt: null }, { endedAt: { $exists: false } }],
          },
        },
      };

      if (options?.tenantId) {
        filter.tenantId = options.tenantId.value;
      }

      this.logger.debug(
        `🔍 Buscando visitantes con sesiones activas. Filtro: ${JSON.stringify(filter)}`,
      );

      const query = this.visitorModel.find(filter);

      if (options?.limit) {
        query.limit(options.limit);
      }

      const entities = await query.exec();

      this.logger.debug(
        `📊 Encontrados ${entities.length} visitantes con sesiones activas`,
      );

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );

      return ok(visitors);
    } catch (error) {
      const errorMessage = `Error al buscar visitantes con sesiones activas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async findBySiteIdWithDetails(
    siteId: SiteId,
    options?: {
      includeOffline?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<Result<PaginatedVisitorsResult, DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        siteId: siteId.value,
      };

      // Si no incluir offline, solo visitantes con sesiones activas
      if (!options?.includeOffline) {
        filter.sessions = {
          $elemMatch: {
            endedAt: { $exists: false }, // Al menos una sesión activa
          },
        };
      }

      this.logger.debug(
        `🔍 Buscando visitantes para sitio ${siteId.value}, includeOffline: ${options?.includeOffline}, filtro: ${JSON.stringify(filter)}`,
      );

      // Obtener el count total SIN paginación
      const totalCount = await this.visitorModel.countDocuments(filter).exec();

      this.logger.debug(
        `📊 Total de visitantes encontrados para sitio ${siteId.value}: ${totalCount}`,
      );

      // Aplicar paginación para obtener los datos
      const query = this.visitorModel.find(filter);

      if (options?.offset) {
        query.skip(options.offset);
      }

      if (options?.limit) {
        query.limit(options.limit);
      }

      const entities = await query.exec();

      this.logger.debug(
        `� Devolviendo ${entities.length} visitantes de ${totalCount} totales para sitio ${siteId.value}`,
      );

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );

      return ok({ visitors, totalCount });
    } catch (error) {
      const errorMessage = `Error al buscar visitantes del sitio ${siteId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  findWithUnassignedChatsBySiteId(
    siteId: SiteId,
    _options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      // TODO: Este es un placeholder para cuando se integre con conversations-v2
      // Por ahora retornamos una lista vacía ya que no tenemos la relación con chats
      this.logger.debug(
        `🔍 Buscando visitantes con chats sin asignar para sitio ${siteId.value}`,
      );

      // Cuando se implemente la relación con chats, este filtro debería buscar:
      // - Visitantes del sitio especificado
      // - Que tengan chats con status 'UNASSIGNED'
      // - Opcional: joinear con la colección de chats

      const emptyResult: VisitorV2[] = [];
      return Promise.resolve(ok(emptyResult));
    } catch (error) {
      const errorMessage = `Error al buscar visitantes con chats sin asignar del sitio ${siteId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new VisitorV2PersistenceError(errorMessage)));
    }
  }

  findWithQueuedChatsBySiteId(
    siteId: SiteId,
    _options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      // TODO: Este es un placeholder para cuando se integre con conversations-v2
      // Por ahora retornamos una lista vacía ya que no tenemos la relación con chats
      this.logger.debug(
        `🔍 Buscando visitantes con chats en cola para sitio ${siteId.value}`,
      );

      // Cuando se implemente la relación con chats, este filtro debería buscar:
      // - Visitantes del sitio especificado
      // - Que tengan chats con status 'QUEUED' o 'WAITING'
      // - Opcional: joinear con la colección de chats

      const emptyResult: VisitorV2[] = [];
      return Promise.resolve(ok(emptyResult));
    } catch (error) {
      const errorMessage = `Error al buscar visitantes con chats en cola del sitio ${siteId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new VisitorV2PersistenceError(errorMessage)));
    }
  }

  async findByTenantIdWithDetails(
    tenantId: TenantId,
    options?: {
      includeOffline?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
    },
  ): Promise<Result<PaginatedVisitorsResult, DomainError>> {
    try {
      const filter: Record<string, unknown> = {
        tenantId: tenantId.value,
      };

      // Si no incluir offline, solo visitantes con sesiones activas
      if (!options?.includeOffline) {
        filter.sessions = {
          $elemMatch: {
            endedAt: { $exists: false }, // Al menos una sesión activa
          },
        };
      }

      this.logger.debug(
        `🔍 Buscando visitantes para tenant ${tenantId.value}, includeOffline: ${options?.includeOffline}, filtro: ${JSON.stringify(filter)}`,
      );

      // Si ordenamos por connectionStatus, usamos aggregation pipeline
      if (options?.sortBy === 'connectionStatus') {
        return this.findByTenantIdWithConnectionStatusSort(
          tenantId,
          filter,
          options,
        );
      }

      // Obtener el count total SIN paginación
      const totalCount = await this.visitorModel.countDocuments(filter).exec();

      this.logger.debug(
        `📊 Total de visitantes encontrados para tenant ${tenantId.value}: ${totalCount}`,
      );

      // Aplicar paginación y ordenamiento para obtener los datos
      const query = this.visitorModel.find(filter);

      // Aplicar ordenamiento
      if (options?.sortBy && options?.sortOrder) {
        const sortField = this.mapSortFieldToMongoField(options.sortBy);
        const sortDirection = options.sortOrder === 'asc' ? 1 : -1;

        this.logger.debug(
          `📋 Ordenando por ${sortField} (${options.sortOrder})`,
        );

        // Para lastActivity, ordenamos por updatedAt como proxy
        // ya que el cálculo real de lastActivity se hace en el handler
        query.sort({ [sortField]: sortDirection });
      } else {
        // Ordenamiento por defecto: updatedAt descendente (más recientes primero)
        query.sort({ updatedAt: -1 });
      }

      if (options?.offset) {
        query.skip(options.offset);
      }

      if (options?.limit) {
        query.limit(options.limit);
      }

      const entities = await query.exec();

      this.logger.debug(
        `📦 Devolviendo ${entities.length} visitantes de ${totalCount} totales para tenant ${tenantId.value}`,
      );

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );

      return ok({ visitors, totalCount });
    } catch (error) {
      const errorMessage = `Error al buscar visitantes del tenant ${tenantId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  /**
   * Busca visitantes ordenados por estado de conexión usando aggregation pipeline
   */
  private async findByTenantIdWithConnectionStatusSort(
    _tenantId: TenantId,
    baseFilter: Record<string, unknown>,
    options?: {
      includeOffline?: boolean;
      limit?: number;
      offset?: number;
      sortOrder?: string;
    },
  ): Promise<Result<PaginatedVisitorsResult, DomainError>> {
    try {
      const sortDirection = options?.sortOrder === 'asc' ? 1 : -1;

      this.logger.debug(
        `🔄 Usando aggregation pipeline para ordenar por connectionStatus (${options?.sortOrder})`,
      );

      // Pipeline de agregación que calcula el estado de conexión
      const aggregationPipeline: unknown[] = [
        // 1. Filtrar por tenant y sesiones activas si aplica
        { $match: baseFilter },

        // 2. Agregar campo calculado para estado de conexión
        {
          $addFields: {
            hasActiveSessions: {
              $anyElementTrue: {
                $map: {
                  input: { $ifNull: ['$sessions', []] },
                  as: 'session',
                  in: {
                    $or: [
                      { $eq: ['$$session.endedAt', null] },
                      { $not: { $ifNull: ['$$session.endedAt', false] } },
                    ],
                  },
                },
              },
            },
          },
        },

        // 3. Ordenar por el campo calculado
        { $sort: { hasActiveSessions: sortDirection, updatedAt: -1 } },
      ];

      // Primero obtener el total sin paginación
      const countPipeline = [
        ...aggregationPipeline,
        { $count: 'total' } as any,
      ];
      const countResult = await this.visitorModel.aggregate(
        countPipeline as any,
      );
      const totalCount = countResult.length > 0 ? countResult[0].total : 0;

      this.logger.debug(
        `📊 Total de visitantes con connectionStatus sort: ${totalCount}`,
      );

      // Aplicar paginación para los datos
      if (options?.offset) {
        aggregationPipeline.push({ $skip: options.offset });
      }

      if (options?.limit) {
        aggregationPipeline.push({ $limit: options.limit });
      }

      const entities = await this.visitorModel.aggregate(
        aggregationPipeline as any,
      );

      this.logger.debug(
        `📦 Devolviendo ${entities.length} visitantes de ${totalCount} totales con connectionStatus sort`,
      );

      const visitors = entities.map((entity) =>
        VisitorV2Mapper.fromPersistence(entity),
      );

      return ok({ visitors, totalCount });
    } catch (error) {
      const errorMessage = `Error al buscar visitantes con ordenamiento por connectionStatus: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  /**
   * Mapea el campo de ordenamiento del DTO al campo de MongoDB
   */
  private mapSortFieldToMongoField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      lastActivity: 'updatedAt', // Usamos updatedAt como proxy de lastActivity
      createdAt: 'createdAt',
      connectionStatus: 'hasActiveSessions', // Campo calculado para estado de conexión
    };

    return fieldMap[sortBy] || 'updatedAt';
  }

  findWithUnassignedChatsByTenantId(
    tenantId: TenantId,
    _options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      // TODO: Este es un placeholder para cuando se integre con conversations-v2
      // Por ahora retornamos una lista vacía ya que no tenemos la relación con chats
      this.logger.debug(
        `🔍 Buscando visitantes con chats sin asignar para tenant ${tenantId.value}`,
      );

      // Cuando se implemente la relación con chats, este filtro debería buscar:
      // - Visitantes del tenant especificado
      // - Que tengan chats con status 'UNASSIGNED'
      // - Opcional: joinear con la colección de chats

      const emptyResult: VisitorV2[] = [];
      return Promise.resolve(ok(emptyResult));
    } catch (error) {
      const errorMessage = `Error al buscar visitantes con chats sin asignar del tenant ${tenantId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new VisitorV2PersistenceError(errorMessage)));
    }
  }

  findWithQueuedChatsByTenantId(
    tenantId: TenantId,
    _options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<Result<VisitorV2[], DomainError>> {
    try {
      // TODO: Este es un placeholder para cuando se integre con conversations-v2
      // Por ahora retornamos una lista vacía ya que no tenemos la relación con chats
      this.logger.debug(
        `🔍 Buscando visitantes con chats en cola para tenant ${tenantId.value}`,
      );

      // Cuando se implemente la relación con chats, este filtro debería buscar:
      // - Visitantes del tenant especificado
      // - Que tengan chats con status 'QUEUED' o 'WAITING'
      // - Opcional: joinear con la colección de chats

      const emptyResult: VisitorV2[] = [];
      return Promise.resolve(ok(emptyResult));
    } catch (error) {
      const errorMessage = `Error al buscar visitantes con chats en cola del tenant ${tenantId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new VisitorV2PersistenceError(errorMessage)));
    }
  }

  async searchWithFilters(
    tenantId: TenantId,
    filters: VisitorSearchFilters,
    sort: VisitorSearchSort,
    pagination: VisitorSearchPagination,
  ): Promise<Result<VisitorSearchResult, DomainError>> {
    try {
      const query = this.buildSearchQuery(tenantId, filters);
      const sortQuery = this.buildSortQuery(sort);
      const skip = (pagination.page - 1) * pagination.limit;

      // Ejecutar query con paginación
      const [visitors, total] = await Promise.all([
        this.visitorModel
          .find(query)
          .sort(sortQuery)
          .skip(skip)
          .limit(pagination.limit)
          .exec(),
        this.visitorModel.countDocuments(query).exec(),
      ]);

      const domainVisitors = visitors.map((doc) =>
        VisitorV2Mapper.fromPersistence(doc),
      );

      const totalPages = Math.ceil(total / pagination.limit);

      return ok({
        visitors: domainVisitors,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
      });
    } catch (error) {
      const errorMessage = `Error en búsqueda con filtros para tenant ${tenantId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  async countWithFilters(
    tenantId: TenantId,
    filters: VisitorSearchFilters,
  ): Promise<Result<number, DomainError>> {
    try {
      const query = this.buildSearchQuery(tenantId, filters);
      const count = await this.visitorModel.countDocuments(query).exec();
      return ok(count);
    } catch (error) {
      const errorMessage = `Error al contar visitantes con filtros para tenant ${tenantId.value}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new VisitorV2PersistenceError(errorMessage));
    }
  }

  /**
   * Construye la query MongoDB a partir de los filtros
   */
  private buildSearchQuery(
    tenantId: TenantId,
    filters: VisitorSearchFilters,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {
      tenantId: tenantId.value,
    };

    // Filtro por lifecycle
    if (filters.lifecycle && filters.lifecycle.length > 0) {
      query['lifecycle'] = { $in: filters.lifecycle };
    }

    // Filtro por connectionStatus
    if (filters.connectionStatus && filters.connectionStatus.length > 0) {
      query['connectionStatus'] = { $in: filters.connectionStatus };
    }

    // Filtro por aceptación de privacidad
    if (filters.hasAcceptedPrivacyPolicy !== undefined) {
      query['hasAcceptedPrivacyPolicy'] = filters.hasAcceptedPrivacyPolicy;
    }

    // Filtro por fecha de creación
    if (filters.createdFrom || filters.createdTo) {
      query['createdAt'] = {};
      if (filters.createdFrom) {
        (query['createdAt'] as Record<string, unknown>)['$gte'] =
          filters.createdFrom;
      }
      if (filters.createdTo) {
        (query['createdAt'] as Record<string, unknown>)['$lte'] =
          filters.createdTo;
      }
    }

    // Filtro por última actividad (updatedAt)
    if (filters.lastActivityFrom || filters.lastActivityTo) {
      query['updatedAt'] = {};
      if (filters.lastActivityFrom) {
        (query['updatedAt'] as Record<string, unknown>)['$gte'] =
          filters.lastActivityFrom;
      }
      if (filters.lastActivityTo) {
        (query['updatedAt'] as Record<string, unknown>)['$lte'] =
          filters.lastActivityTo;
      }
    }

    // Filtro por siteIds
    if (filters.siteIds && filters.siteIds.length > 0) {
      query['siteId'] = { $in: filters.siteIds };
    }

    // Filtro por URL actual (búsqueda parcial)
    if (filters.currentUrlContains) {
      query['currentUrl'] = {
        $regex: this.escapeRegex(filters.currentUrlContains),
        $options: 'i',
      };
    }

    // Filtro por sesiones activas
    if (filters.hasActiveSessions !== undefined) {
      if (filters.hasActiveSessions) {
        query['sessions'] = {
          $elemMatch: {
            endedAt: null,
          },
        };
      } else {
        query['$or'] = [
          { sessions: { $size: 0 } },
          { 'sessions.endedAt': { $ne: null } },
        ];
      }
    }

    return query;
  }

  /**
   * Construye la query de ordenamiento
   */
  private buildSortQuery(sort: VisitorSearchSort): Record<string, 1 | -1> {
    const direction = sort.direction === 'ASC' ? 1 : -1;
    const fieldMap: Record<string, string> = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      lifecycle: 'lifecycle',
      connectionStatus: 'connectionStatus',
    };

    const mongoField = fieldMap[sort.field] || 'updatedAt';
    return { [mongoField]: direction };
  }

  /**
   * Escapa caracteres especiales para uso en regex
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
