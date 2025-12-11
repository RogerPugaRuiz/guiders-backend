/**
 * Implementación MongoDB del repositorio de configuración LLM
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Provider } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../../domain/llm-config.repository';
import { LlmCompanyConfig } from '../../domain/value-objects/llm-company-config';
import {
  LlmCompanyConfigSchema,
  LlmCompanyConfigDocument,
} from '../schemas/llm-company-config.schema';
import {
  LlmConfigNotFoundError,
  LlmError,
} from '../../domain/errors/llm.error';

@Injectable()
export class MongoLlmConfigRepositoryImpl implements ILlmConfigRepository {
  private readonly logger = new Logger(MongoLlmConfigRepositoryImpl.name);

  constructor(
    @InjectModel(LlmCompanyConfigSchema.name)
    private readonly model: Model<LlmCompanyConfigDocument>,
  ) {}

  async save(config: LlmCompanyConfig): Promise<Result<void, DomainError>> {
    try {
      const primitives = config.toPrimitives();

      await this.model.findOneAndUpdate(
        { companyId: primitives.companyId },
        {
          $set: {
            aiAutoResponseEnabled: primitives.aiAutoResponseEnabled,
            aiSuggestionsEnabled: primitives.aiSuggestionsEnabled,
            aiRespondWithCommercial: primitives.aiRespondWithCommercial,
            preferredProvider: primitives.preferredProvider,
            preferredModel: primitives.preferredModel,
            customSystemPrompt: primitives.customSystemPrompt,
            maxResponseTokens: primitives.maxResponseTokens,
            temperature: primitives.temperature,
            responseDelayMs: primitives.responseDelayMs,
            toolConfig: primitives.toolConfig,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true },
      );

      this.logger.debug(
        `Configuración guardada para empresa ${config.companyId}`,
      );
      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al guardar configuración: ${errorMessage}`);
      return err(
        new LlmError(`Error al guardar configuración: ${errorMessage}`),
      );
    }
  }

  async findByCompanyId(
    companyId: string,
  ): Promise<Result<LlmCompanyConfig, DomainError>> {
    try {
      const doc = await this.model.findOne({ companyId }).lean().exec();

      if (!doc) {
        return err(new LlmConfigNotFoundError(companyId));
      }

      const config = LlmCompanyConfig.fromPrimitives({
        companyId: doc.companyId,
        aiAutoResponseEnabled: doc.aiAutoResponseEnabled,
        aiSuggestionsEnabled: doc.aiSuggestionsEnabled,
        aiRespondWithCommercial: doc.aiRespondWithCommercial,
        preferredProvider: doc.preferredProvider,
        preferredModel: doc.preferredModel,
        customSystemPrompt: doc.customSystemPrompt ?? undefined,
        maxResponseTokens: doc.maxResponseTokens,
        temperature: doc.temperature,
        responseDelayMs: doc.responseDelayMs,
        toolConfig: doc.toolConfig,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });

      return ok(config);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al buscar configuración: ${errorMessage}`);
      return err(
        new LlmError(`Error al buscar configuración: ${errorMessage}`),
      );
    }
  }

  async delete(companyId: string): Promise<Result<void, DomainError>> {
    try {
      const result = await this.model.deleteOne({ companyId }).exec();

      if (result.deletedCount === 0) {
        return err(new LlmConfigNotFoundError(companyId));
      }

      this.logger.debug(`Configuración eliminada para empresa ${companyId}`);
      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al eliminar configuración: ${errorMessage}`);
      return err(
        new LlmError(`Error al eliminar configuración: ${errorMessage}`),
      );
    }
  }

  async exists(companyId: string): Promise<Result<boolean, DomainError>> {
    try {
      const count = await this.model.countDocuments({ companyId }).exec();
      return ok(count > 0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al verificar existencia: ${errorMessage}`);
      return err(
        new LlmError(`Error al verificar existencia: ${errorMessage}`),
      );
    }
  }
}

/**
 * Provider para inyección de dependencias
 */
export const MongoLlmConfigRepositoryProvider: Provider = {
  provide: LLM_CONFIG_REPOSITORY,
  useClass: MongoLlmConfigRepositoryImpl,
};
