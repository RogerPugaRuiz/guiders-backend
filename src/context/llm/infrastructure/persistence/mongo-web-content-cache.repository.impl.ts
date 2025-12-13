/**
 * Implementación MongoDB del repositorio de cache de contenido web
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Provider } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  IWebContentCacheRepository,
  CachedWebContent,
  WEB_CONTENT_CACHE_REPOSITORY,
} from '../../domain/web-content-cache.repository';
import {
  WebContentCacheSchema,
  WebContentCacheDocument,
} from '../schemas/web-content-cache.schema';
import { LlmError } from '../../domain/errors/llm.error';

@Injectable()
export class MongoWebContentCacheRepositoryImpl
  implements IWebContentCacheRepository
{
  private readonly logger = new Logger(MongoWebContentCacheRepositoryImpl.name);

  constructor(
    @InjectModel(WebContentCacheSchema.name)
    private readonly model: Model<WebContentCacheDocument>,
  ) {}

  async findByUrlAndCompany(
    url: string,
    companyId: string,
  ): Promise<Result<CachedWebContent | null, DomainError>> {
    try {
      const doc = await this.model
        .findOne({
          url,
          companyId,
          expiresAt: { $gt: new Date() }, // Solo si no ha expirado
        })
        .lean()
        .exec();

      if (!doc) {
        this.logger.debug(`Cache miss para ${url} (company: ${companyId})`);
        return ok(null);
      }

      this.logger.debug(`Cache hit para ${url} (company: ${companyId})`);

      return ok({
        url: doc.url,
        companyId: doc.companyId,
        content: doc.content,
        originalSize: doc.originalSize,
        truncated: doc.truncated,
        fetchTimeMs: doc.fetchTimeMs,
        createdAt: doc.createdAt,
        expiresAt: doc.expiresAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al buscar en cache: ${errorMessage}`);
      return err(new LlmError(`Error al buscar en cache: ${errorMessage}`));
    }
  }

  async save(content: CachedWebContent): Promise<Result<void, DomainError>> {
    try {
      await this.model.findOneAndUpdate(
        { url: content.url, companyId: content.companyId },
        {
          $set: {
            content: content.content,
            originalSize: content.originalSize,
            truncated: content.truncated,
            fetchTimeMs: content.fetchTimeMs,
            expiresAt: content.expiresAt,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true },
      );

      this.logger.debug(
        `Cache guardado para ${content.url} (company: ${content.companyId}, expires: ${content.expiresAt.toISOString()})`,
      );
      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al guardar en cache: ${errorMessage}`);
      return err(new LlmError(`Error al guardar en cache: ${errorMessage}`));
    }
  }

  async delete(
    url: string,
    companyId: string,
  ): Promise<Result<void, DomainError>> {
    try {
      await this.model.deleteOne({ url, companyId }).exec();

      this.logger.debug(
        `Cache eliminado para ${url} (company: ${companyId})`,
      );
      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al eliminar cache: ${errorMessage}`);
      return err(new LlmError(`Error al eliminar cache: ${errorMessage}`));
    }
  }

  async deleteByCompany(
    companyId: string,
  ): Promise<Result<number, DomainError>> {
    try {
      const result = await this.model.deleteMany({ companyId }).exec();

      this.logger.debug(
        `Cache eliminado para empresa ${companyId}: ${result.deletedCount} entradas`,
      );
      return ok(result.deletedCount);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al eliminar cache de empresa: ${errorMessage}`);
      return err(
        new LlmError(`Error al eliminar cache de empresa: ${errorMessage}`),
      );
    }
  }

  async deleteExpired(): Promise<Result<number, DomainError>> {
    try {
      const result = await this.model
        .deleteMany({ expiresAt: { $lte: new Date() } })
        .exec();

      this.logger.debug(`Cache expirado eliminado: ${result.deletedCount} entradas`);
      return ok(result.deletedCount);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al eliminar cache expirado: ${errorMessage}`);
      return err(
        new LlmError(`Error al eliminar cache expirado: ${errorMessage}`),
      );
    }
  }
}

/**
 * Provider para inyección de dependencias
 */
export const MongoWebContentCacheRepositoryProvider: Provider = {
  provide: WEB_CONTENT_CACHE_REPOSITORY,
  useClass: MongoWebContentCacheRepositoryImpl,
};
