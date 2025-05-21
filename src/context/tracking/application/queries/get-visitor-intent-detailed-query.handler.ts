import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetVisitorIntentDetailedQuery } from './get-visitor-intent-detailed.query';
import {
  INTENT_DETECTOR_REPOSITORY,
  IIntentDetectorRepository,
} from '../../domain/intent-detector.repository';
import { VisitorIntentDetailedQueryService } from './visitor-intent-detailed-query.service';
import { Result, err } from 'src/context/shared/domain/result';
import { VisitorIntentDetailedResponseDto } from '../dtos/visitor-intent-detailed-response.dto';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { DomainError } from 'src/context/shared/domain/domain.error';

// Handler para la query de intención detallada
@QueryHandler(GetVisitorIntentDetailedQuery)
export class GetVisitorIntentDetailedQueryHandler
  implements
    IQueryHandler<
      GetVisitorIntentDetailedQuery,
      Result<VisitorIntentDetailedResponseDto, DomainError>
    >
{
  constructor(
    @Inject(INTENT_DETECTOR_REPOSITORY)
    private readonly intentRepository: IIntentDetectorRepository,
  ) {}

  // Maneja la query y retorna el DTO detallado
  async execute(
    query: GetVisitorIntentDetailedQuery,
  ): Promise<Result<VisitorIntentDetailedResponseDto, DomainError>> {
    // Buscar la intención usando VisitorId como value object
    const result = await this.intentRepository.findOne(
      VisitorId.create(query.visitorId),
    );
    if (result.isErr()) {
      // Propaga el error de dominio usando la función de fábrica err
      return err<VisitorIntentDetailedResponseDto, DomainError>(result.error);
    }
    const intent = result.value;
    return VisitorIntentDetailedQueryService.toDetailedResponse(intent);
  }
}
