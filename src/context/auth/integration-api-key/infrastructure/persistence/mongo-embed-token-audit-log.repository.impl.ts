/**
 * Implementación Mongo del IEmbedTokenAuditLogRepository (Story 2.2, Task 2.4).
 *
 * Sigue el patrón de `mongo-crm-sync-record.repository.impl.ts` (leads):
 * - `@InjectModel(Schema.name)` para DI de Mongoose
 * - try/catch que retorna `err(...)` en lugar de throw
 * - Logger para observabilidad
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ok, err, okVoid } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  IEmbedTokenAuditLogRepository,
  EmbedTokenAuditLogPrimitives,
  EmbedTokenAuditLogQuery,
  EmbedTokenAuditLogQueryResult,
} from '../../domain/repositories/embed-token-audit-log.repository';
import {
  EmbedTokenAuditLogSchema,
  EmbedTokenAuditLogDocument,
} from '../schemas/embed-token-audit-log.schema';

@Injectable()
export class MongoEmbedTokenAuditLogRepositoryImpl
  implements IEmbedTokenAuditLogRepository
{
  private readonly logger = new Logger(
    MongoEmbedTokenAuditLogRepositoryImpl.name,
  );

  constructor(
    @InjectModel(EmbedTokenAuditLogSchema.name)
    private readonly model: Model<EmbedTokenAuditLogDocument>,
  ) {}

  async save(
    event: EmbedTokenAuditLogPrimitives,
  ): Promise<Result<void, DomainError>> {
    try {
      await this.model.create(event);
      return okVoid();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error guardando audit log event ${event.id}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return err(new MongoEmbedAuditLogPersistenceError(message));
    }
  }

  async findByQuery(
    query: EmbedTokenAuditLogQuery,
  ): Promise<Result<EmbedTokenAuditLogQueryResult, DomainError>> {
    try {
      const filter: Record<string, unknown> = { companyId: query.companyId };

      if (query.userId) {
        filter.userId = query.userId;
      }
      if (query.fromDate || query.toDate) {
        filter.timestamp = {};
        if (query.fromDate) {
          (filter.timestamp as Record<string, Date>).$gte = query.fromDate;
        }
        if (query.toDate) {
          (filter.timestamp as Record<string, Date>).$lte = query.toDate;
        }
      }
      if (query.result) {
        filter.result = query.result;
      }

      const limit = Math.min(query.limit ?? 100, 1000);
      const skip = query.skip ?? 0;

      // TD-2 fix: usar $facet para ejecutar countDocuments + find en
      // una sola operación atómica del lado del servidor Mongo.
      // Antes: 2 round-trips separados donde el total y los eventos
      // podían ser inconsistentes si había escrituras concurrentes
      // entre las dos queries (paginación drifted).
      //
      // $facet ejecuta múltiples pipelines sobre el mismo dataset
      // sincrónicamente, retornando { total: [N], events: [docs] }.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aggregateResult: Array<any> = await this.model
        .aggregate([
          { $match: filter },
          {
            $facet: {
              total: [{ $count: 'count' }],
              events: [
                { $sort: { timestamp: -1 } },
                { $skip: skip },
                { $limit: limit },
              ],
            },
          },
        ])
        .exec();

      const facetResult = aggregateResult[0] as
        | {
            total: Array<{ count: number }>;
            events: EmbedTokenAuditLogDocument[];
          }
        | undefined;

      if (!facetResult) {
        return ok({ events: [], total: 0 });
      }

      const total = facetResult.total[0]?.count ?? 0;
      const events: EmbedTokenAuditLogPrimitives[] = facetResult.events.map(
        (doc) => this.toPrimitives(doc),
      );

      return ok({ events, total });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error consultando audit log: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      return err(new MongoEmbedAuditLogPersistenceError(message));
    }
  }

  private toPrimitives(
    doc: EmbedTokenAuditLogDocument,
  ): EmbedTokenAuditLogPrimitives {
    const obj = doc.toObject() as unknown as Record<string, unknown>;
    return {
      id: obj['id'] as string,
      companyId: obj['companyId'] as string,
      userId: obj['userId'] as string | undefined,
      origin: obj['origin'] as string,
      timestamp: obj['timestamp'] as Date,
      ipAddressHash: obj['ipAddressHash'] as string,
      userAgent: obj['userAgent'] as string,
      endpoint: obj['endpoint'] as string,
      result: obj['result'] as 'success' | 'failure',
      failureReason: obj['failureReason'] as string | undefined,
      failureDetail: obj['failureDetail'] as string | undefined,
      // TD-1: createdAt/updatedAt NO se incluyen en primitives
      // (Mongoose los maneja vía timestamps: true).
    };
  }
}

/**
 * Error de persistencia del audit log (Mongo down, write conflict, etc.).
 * Mapeable a HTTP 503 por el controller de query (si lo expone).
 */
export class MongoEmbedAuditLogPersistenceError extends DomainError {
  public readonly code = 'EMBED_AUDIT_LOG_PERSISTENCE_ERROR';
  // 503 (not 500): Mongo down is a transient infrastructure issue
  // (recoverable, retry-friendly), not a server bug. 500 would imply
  // a code defect and trigger wrong alerts.
  public readonly statusCode = 503;

  constructor(message: string) {
    super(message);
  }
}
