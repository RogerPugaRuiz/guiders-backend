import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ok, err, okVoid } from '../../../../shared/domain/result';
import { DomainError } from '../../../../shared/domain/domain.error';
import { AssignmentRules } from '../../../domain/value-objects/assignment-rules';
import { AssignmentRulesError } from '../../../domain/errors/assignment-rules.error';
import {
  IAssignmentRulesRepository,
  AssignmentRulesFilters,
} from '../../../domain/assignment-rules.repository';
import { AssignmentRulesMongoEntity } from '../entity/assignment-rules-mongoose.entity';
import { AssignmentRulesMapper } from './mappers/assignment-rules.mapper';

/**
 * Error específico para problemas de persistencia de reglas de asignación
 */
export class AssignmentRulesPersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Implementación MongoDB del repositorio de reglas de asignación
 */
@Injectable()
export class MongoAssignmentRulesRepository
  implements IAssignmentRulesRepository
{
  private readonly logger = new Logger(MongoAssignmentRulesRepository.name);

  constructor(
    @InjectModel(AssignmentRulesMongoEntity.name)
    private readonly assignmentRulesModel: Model<AssignmentRulesMongoEntity>,
  ) {}

  async save(
    rules: AssignmentRules,
  ): Promise<Result<void, AssignmentRulesError>> {
    try {
      const persistenceEntity = AssignmentRulesMapper.toPersistence(rules);

      this.logger.log(
        `💾 Guardando reglas de asignación: companyId=${persistenceEntity.companyId}, siteId=${persistenceEntity.siteId}`,
      );

      // Usar upsert para crear o actualizar
      await this.assignmentRulesModel.findOneAndUpdate(
        { id: persistenceEntity.id },
        persistenceEntity,
        { upsert: true, new: true },
      );

      this.logger.log(
        `✅ Reglas guardadas: ${persistenceEntity.companyId}${
          persistenceEntity.siteId ? `:${persistenceEntity.siteId}` : ''
        }`,
      );

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al guardar reglas de asignación: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }

  async findByCompanyAndSite(
    companyId: string,
    siteId?: string,
  ): Promise<Result<AssignmentRules | null, AssignmentRulesError>> {
    try {
      const query = {
        companyId,
        ...(siteId ? { siteId } : { siteId: { $exists: false } }),
      };

      this.logger.log(`🔍 Buscando reglas con query: ${JSON.stringify(query)}`);

      const entity = await this.assignmentRulesModel.findOne(query);

      if (!entity) {
        this.logger.log(
          `❌ No se encontraron reglas para ${companyId}${
            siteId ? `:${siteId}` : ''
          }`,
        );
        return ok(null);
      }

      this.logger.log(
        `✅ Reglas encontradas: ${companyId}${siteId ? `:${siteId}` : ''}`,
      );

      const rules = AssignmentRulesMapper.fromPersistence(entity);
      return ok(rules);
    } catch (error) {
      const errorMessage = `Error al buscar reglas por empresa y sitio: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }

  async findByFilters(
    filters: AssignmentRulesFilters,
  ): Promise<Result<AssignmentRules[], AssignmentRulesError>> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.companyId) {
        query.companyId = filters.companyId;
      }

      if (filters.siteId) {
        query.siteId = filters.siteId;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.strategy) {
        query.defaultStrategy = filters.strategy;
      }

      this.logger.log(
        `🔍 Filtrando reglas con query: ${JSON.stringify(query)}`,
      );

      const entities = await this.assignmentRulesModel.find(query);

      this.logger.log(`📊 Encontradas ${entities.length} reglas`);

      const rules = entities.map((entity) =>
        AssignmentRulesMapper.fromPersistence(entity),
      );

      return ok(rules);
    } catch (error) {
      const errorMessage = `Error al filtrar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }

  async update(
    rules: AssignmentRules,
  ): Promise<Result<void, AssignmentRulesError>> {
    try {
      const persistenceEntity = AssignmentRulesMapper.toPersistence(rules);

      this.logger.log(
        `🔄 Actualizando reglas: ${persistenceEntity.companyId}${
          persistenceEntity.siteId ? `:${persistenceEntity.siteId}` : ''
        }`,
      );

      const result = await this.assignmentRulesModel.updateOne(
        { id: persistenceEntity.id },
        persistenceEntity,
      );

      if (result.matchedCount === 0) {
        return err(
          new AssignmentRulesError(
            `No se encontraron reglas para actualizar: ${
              persistenceEntity.companyId
            }${persistenceEntity.siteId ? `:${persistenceEntity.siteId}` : ''}`,
          ),
        );
      }

      this.logger.log(
        `✅ Reglas actualizadas: ${persistenceEntity.companyId}${
          persistenceEntity.siteId ? `:${persistenceEntity.siteId}` : ''
        }`,
      );

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al actualizar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }

  async delete(
    companyId: string,
    siteId?: string,
  ): Promise<Result<void, AssignmentRulesError>> {
    try {
      const query = {
        companyId,
        ...(siteId ? { siteId } : { siteId: { $exists: false } }),
      };

      this.logger.log(
        `🗑️ Eliminando reglas con query: ${JSON.stringify(query)}`,
      );

      const result = await this.assignmentRulesModel.deleteOne(query);

      if (result.deletedCount === 0) {
        return err(
          new AssignmentRulesError(
            `No se encontraron reglas para eliminar: ${companyId}${
              siteId ? `:${siteId}` : ''
            }`,
          ),
        );
      }

      this.logger.log(
        `✅ Reglas eliminadas: ${companyId}${siteId ? `:${siteId}` : ''}`,
      );

      return okVoid();
    } catch (error) {
      const errorMessage = `Error al eliminar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }

  async findApplicableRules(
    companyId: string,
    siteId?: string,
  ): Promise<Result<AssignmentRules | null, AssignmentRulesError>> {
    try {
      this.logger.log(
        `🔍 Buscando reglas aplicables para ${companyId}${
          siteId ? `:${siteId}` : ''
        }`,
      );

      // Prioridad: sitio específico > empresa general
      if (siteId) {
        this.logger.log(
          `   → Intentando reglas específicas de sitio: ${companyId}:${siteId}`,
        );

        const siteSpecificResult = await this.findByCompanyAndSite(
          companyId,
          siteId,
        );
        if (siteSpecificResult.isErr()) {
          return siteSpecificResult;
        }
        if (siteSpecificResult.value && siteSpecificResult.value.isActive) {
          this.logger.log(
            `✅ Reglas específicas de sitio encontradas y activas`,
          );
          return siteSpecificResult;
        } else if (siteSpecificResult.value) {
          this.logger.log(
            `⚠️ Reglas específicas de sitio encontradas pero inactivas`,
          );
        }
      }

      // Buscar reglas generales de empresa
      this.logger.log(
        `   → Intentando reglas generales de empresa: ${companyId}`,
      );
      const companyResult = await this.findByCompanyAndSite(companyId);
      if (companyResult.isErr()) {
        return companyResult;
      }

      if (companyResult.value && companyResult.value.isActive) {
        this.logger.log(`✅ Reglas generales de empresa encontradas y activas`);
        return companyResult;
      } else if (companyResult.value) {
        this.logger.log(
          `⚠️ Reglas generales de empresa encontradas pero inactivas`,
        );
      }

      this.logger.log(
        `❌ No se encontraron reglas aplicables activas para ${companyId}${
          siteId ? `:${siteId}` : ''
        }`,
      );

      return ok(null);
    } catch (error) {
      const errorMessage = `Error al buscar reglas aplicables: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }
}
