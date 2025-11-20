import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';
import { CreateAssignmentRulesCommand } from './create-assignment-rules.command';
import { AssignmentRules } from '../../domain/value-objects/assignment-rules';
import {
  IAssignmentRulesRepository,
  ASSIGNMENT_RULES_REPOSITORY,
} from '../../domain/assignment-rules.repository';

/**
 * Error específico para creación de reglas
 */
export class CreateAssignmentRulesError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Command Handler para crear reglas de auto-asignación
 */
@CommandHandler(CreateAssignmentRulesCommand)
export class CreateAssignmentRulesCommandHandler
  implements ICommandHandler<CreateAssignmentRulesCommand>
{
  private readonly logger = new Logger(
    CreateAssignmentRulesCommandHandler.name,
  );

  constructor(
    @Inject(ASSIGNMENT_RULES_REPOSITORY)
    private readonly rulesRepository: IAssignmentRulesRepository,
  ) {}

  async execute(
    command: CreateAssignmentRulesCommand,
  ): Promise<Result<void, CreateAssignmentRulesError>> {
    try {
      const { data } = command;

      this.logger.log(
        `Creando reglas de auto-asignación para empresa ${data.companyId}${
          data.siteId ? ` y sitio ${data.siteId}` : ''
        }`,
      );

      // Verificar si ya existen reglas para esta empresa/sitio
      const existingRulesResult =
        await this.rulesRepository.findByCompanyAndSite(
          data.companyId,
          data.siteId,
        );

      if (existingRulesResult.isErr()) {
        return err(
          new CreateAssignmentRulesError(
            `Error al verificar reglas existentes: ${existingRulesResult.error.message}`,
          ),
        );
      }

      if (existingRulesResult.value) {
        return err(
          new CreateAssignmentRulesError(
            `Ya existen reglas para la empresa ${data.companyId}${
              data.siteId ? ` y sitio ${data.siteId}` : ''
            }`,
          ),
        );
      }

      // Crear las reglas
      const now = new Date();
      const rules = AssignmentRules.create({
        ...data,
        createdAt: now,
        updatedAt: now,
      });

      // Persistir
      const saveResult = await this.rulesRepository.save(rules);
      if (saveResult.isErr()) {
        return err(
          new CreateAssignmentRulesError(
            `Error al guardar reglas: ${saveResult.error.message}`,
          ),
        );
      }

      this.logger.log(
        `✅ Reglas de auto-asignación creadas exitosamente para empresa ${data.companyId}${
          data.siteId ? ` y sitio ${data.siteId}` : ''
        }`,
      );

      return ok(undefined);
    } catch (error) {
      const errorMessage = `Error inesperado al crear reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new CreateAssignmentRulesError(errorMessage));
    }
  }
}
