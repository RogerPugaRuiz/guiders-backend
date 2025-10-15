import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVisitorConsentHistoryQuery } from './get-visitor-consent-history.query';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../../domain/consent.repository';
import { VisitorId } from '../../../visitors-v2/domain/value-objects/visitor-id';
import { Result, ok, err } from '../../../shared/domain/result';
import { ConsentError } from '../../domain/errors/consent.error';
import { VisitorConsentPrimitives } from '../../domain/visitor-consent.aggregate';

/**
 * Handler para obtener el historial de consentimientos de un visitante
 */
@QueryHandler(GetVisitorConsentHistoryQuery)
export class GetVisitorConsentHistoryQueryHandler
  implements IQueryHandler<GetVisitorConsentHistoryQuery>
{
  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repository: ConsentRepository,
  ) {}

  async execute(
    query: GetVisitorConsentHistoryQuery,
  ): Promise<Result<VisitorConsentPrimitives[], ConsentError>> {
    try {
      const visitorId = VisitorId.create(query.visitorId);

      const result = await this.repository.findByVisitorId(visitorId);

      if (result.isErr()) {
        return err(new ConsentError(result.error.message));
      }

      const primitives = result.value.map((consent) => consent.toPrimitives());
      return ok(primitives);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const consentError = new ConsentError(
        `Error al obtener historial de consentimientos: ${message}`,
      );
      return err(consentError);
    }
  }
}
