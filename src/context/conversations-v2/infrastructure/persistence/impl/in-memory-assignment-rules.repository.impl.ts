import { Injectable, Logger } from '@nestjs/common';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { AssignmentRulesError } from '../../../domain/errors/assignment-rules.error';
import { AssignmentRules } from '../../../domain/value-objects/assignment-rules';
import {
  IAssignmentRulesRepository,
  AssignmentRulesFilters,
} from '../../../domain/assignment-rules.repository';
import { AssignmentStrategy } from '../../../domain/services/chat-auto-assignment.domain-service';

/**
 * Implementación en memoria del repositorio de reglas de asignamiento
 * TODO: Reemplazar con implementación real (MongoDB o PostgreSQL)
 */
@Injectable()
export class InMemoryAssignmentRulesRepository
  implements IAssignmentRulesRepository
{
  private readonly logger = new Logger(InMemoryAssignmentRulesRepository.name);
  private readonly rules = new Map<string, AssignmentRules>();

  /**
   * Genera clave única para empresa/sitio
   */
  private getKey(companyId: string, siteId?: string): string {
    return siteId ? `${companyId}:${siteId}` : companyId;
  }

  async save(
    rules: AssignmentRules,
  ): Promise<Result<void, AssignmentRulesError>> {
    try {
      const key = this.getKey(rules.companyId, rules.siteId);
      this.rules.set(key, rules);

      this.logger.log(
        `Reglas guardadas para ${rules.companyId}${
          rules.siteId ? `:${rules.siteId}` : ''
        }`,
      );

      return Promise.resolve(ok(undefined));
    } catch (error) {
      const errorMessage = `Error al guardar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new AssignmentRulesError(errorMessage)));
    }
  }

  async findByCompanyAndSite(
    companyId: string,
    siteId?: string,
  ): Promise<Result<AssignmentRules | null, AssignmentRulesError>> {
    try {
      const key = this.getKey(companyId, siteId);
      const rules = this.rules.get(key) || null;

      this.logger.log(
        `Buscando reglas para ${companyId}${
          siteId ? `:${siteId}` : ''
        } - ${rules ? 'Encontradas' : 'No encontradas'}`,
      );

      return Promise.resolve(ok(rules));
    } catch (error) {
      const errorMessage = `Error al buscar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new AssignmentRulesError(errorMessage)));
    }
  }

  async findByFilters(
    filters: AssignmentRulesFilters,
  ): Promise<Result<AssignmentRules[], AssignmentRulesError>> {
    try {
      const allRules = Array.from(this.rules.values());
      const filteredRules = allRules.filter((rules) => {
        if (filters.companyId && rules.companyId !== filters.companyId) {
          return false;
        }

        if (filters.siteId && rules.siteId !== filters.siteId) {
          return false;
        }

        if (
          filters.isActive !== undefined &&
          rules.isActive !== filters.isActive
        ) {
          return false;
        }

        if (
          filters.strategy &&
          rules.defaultStrategy !== (filters.strategy as AssignmentStrategy)
        ) {
          return false;
        }

        return true;
      });

      this.logger.log(
        `Filtrado de reglas: ${filteredRules.length}/${allRules.length} coincidencias`,
      );

      return Promise.resolve(ok(filteredRules));
    } catch (error) {
      const errorMessage = `Error al filtrar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new AssignmentRulesError(errorMessage)));
    }
  }

  async update(
    rules: AssignmentRules,
  ): Promise<Result<void, AssignmentRulesError>> {
    try {
      const key = this.getKey(rules.companyId, rules.siteId);

      if (!this.rules.has(key)) {
        return Promise.resolve(
          err(
            new AssignmentRulesError(
              `No se encontraron reglas para actualizar: ${rules.companyId}${
                rules.siteId ? `:${rules.siteId}` : ''
              }`,
            ),
          ),
        );
      }

      this.rules.set(key, rules);

      this.logger.log(
        `Reglas actualizadas para ${rules.companyId}${
          rules.siteId ? `:${rules.siteId}` : ''
        }`,
      );

      return Promise.resolve(ok(undefined));
    } catch (error) {
      const errorMessage = `Error al actualizar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new AssignmentRulesError(errorMessage)));
    }
  }

  async delete(
    companyId: string,
    siteId?: string,
  ): Promise<Result<void, AssignmentRulesError>> {
    try {
      const key = this.getKey(companyId, siteId);
      const deleted = this.rules.delete(key);

      if (!deleted) {
        return Promise.resolve(
          err(
            new AssignmentRulesError(
              `No se encontraron reglas para eliminar: ${companyId}${
                siteId ? `:${siteId}` : ''
              }`,
            ),
          ),
        );
      }

      this.logger.log(
        `Reglas eliminadas para ${companyId}${siteId ? `:${siteId}` : ''}`,
      );

      return Promise.resolve(ok(undefined));
    } catch (error) {
      const errorMessage = `Error al eliminar reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return Promise.resolve(err(new AssignmentRulesError(errorMessage)));
    }
  }

  async findApplicableRules(
    companyId: string,
    siteId?: string,
  ): Promise<Result<AssignmentRules | null, AssignmentRulesError>> {
    try {
      // Prioridad: sitio específico > empresa general
      if (siteId) {
        const siteSpecificResult = await this.findByCompanyAndSite(
          companyId,
          siteId,
        );
        if (siteSpecificResult.isErr()) {
          return siteSpecificResult;
        }
        if (siteSpecificResult.value) {
          this.logger.log(
            `Reglas específicas de sitio encontradas para ${companyId}:${siteId}`,
          );
          return siteSpecificResult;
        }
      }

      // Buscar reglas generales de empresa
      const companyResult = await this.findByCompanyAndSite(companyId);
      if (companyResult.isErr()) {
        return companyResult;
      }

      if (companyResult.value) {
        this.logger.log(
          `Reglas generales de empresa encontradas para ${companyId}`,
        );
      } else {
        this.logger.log(
          `No se encontraron reglas aplicables para ${companyId}${
            siteId ? `:${siteId}` : ''
          }`,
        );
      }

      return companyResult;
    } catch (error) {
      const errorMessage = `Error al buscar reglas aplicables: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new AssignmentRulesError(errorMessage));
    }
  }
}
