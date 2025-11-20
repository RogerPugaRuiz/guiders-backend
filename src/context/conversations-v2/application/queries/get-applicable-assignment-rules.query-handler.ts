import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { Result, ok, err } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';
import { GetApplicableAssignmentRulesQuery } from './get-applicable-assignment-rules.query';
import { AssignmentRules } from '../../domain/value-objects/assignment-rules';
import {
  IAssignmentRulesRepository,
  ASSIGNMENT_RULES_REPOSITORY,
} from '../../domain/assignment-rules.repository';

/**
 * Error específico para obtener reglas
 */
export class GetApplicableAssignmentRulesError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Query Handler para obtener reglas aplicables
 */
@QueryHandler(GetApplicableAssignmentRulesQuery)
export class GetApplicableAssignmentRulesQueryHandler
  implements IQueryHandler<GetApplicableAssignmentRulesQuery>
{
  private readonly logger = new Logger(
    GetApplicableAssignmentRulesQueryHandler.name,
  );

  constructor(
    @Inject(ASSIGNMENT_RULES_REPOSITORY)
    private readonly rulesRepository: IAssignmentRulesRepository,
  ) {}

  async execute(
    query: GetApplicableAssignmentRulesQuery,
  ): Promise<
    Result<AssignmentRules | null, GetApplicableAssignmentRulesError>
  > {
    try {
      const { companyId, siteId } = query;

      this.logger.log(
        `Obteniendo reglas aplicables para empresa ${companyId}${
          siteId ? ` y sitio ${siteId}` : ''
        }`,
      );

      const rulesResult = await this.rulesRepository.findApplicableRules(
        companyId,
        siteId,
      );

      if (rulesResult.isErr()) {
        return err(
          new GetApplicableAssignmentRulesError(
            `Error al obtener reglas: ${rulesResult.error.message}`,
          ),
        );
      }

      return ok(rulesResult.value);
    } catch (error) {
      const errorMessage = `Error inesperado al obtener reglas: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new GetApplicableAssignmentRulesError(errorMessage));
    }
  }
}
