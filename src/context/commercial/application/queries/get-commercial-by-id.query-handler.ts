import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetCommercialByIdQuery } from './get-commercial-by-id.query';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import {
  COMMERCIAL_REPOSITORY,
  CommercialRepository,
} from '../../domain/commercial.repository';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Commercial } from '../../domain/commercial.aggregate';

/**
 * Error al obtener comercial
 */
class CommercialQueryError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Handler para la query GetCommercialByIdQuery
 * Obtiene un comercial específico por su ID
 */
@QueryHandler(GetCommercialByIdQuery)
export class GetCommercialByIdQueryHandler
  implements
    IQueryHandler<
      GetCommercialByIdQuery,
      Result<Commercial | null, DomainError>
    >
{
  private readonly logger = new Logger(GetCommercialByIdQueryHandler.name);

  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
  ) {}

  async execute(
    query: GetCommercialByIdQuery,
  ): Promise<Result<Commercial | null, DomainError>> {
    try {
      this.logger.debug(`Obteniendo comercial con ID: ${query.commercialId}`);

      const commercialId = new CommercialId(query.commercialId);
      const result = await this.commercialRepository.findById(commercialId);

      if (result.isErr()) {
        this.logger.error(
          `Error al obtener comercial ${query.commercialId}:`,
          result.error,
        );
        return err(result.error);
      }

      return ok(result.unwrap());
    } catch (error) {
      this.logger.error(
        `Error inesperado al obtener comercial ${query.commercialId}:`,
        error,
      );
      return err(
        new CommercialQueryError(
          `Error al obtener comercial: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}
