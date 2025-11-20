import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetVisitorAuditLogsQuery } from './get-visitor-audit-logs.query';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { Result, ok, err } from '../../../shared/domain/result';
import { ConsentPersistenceError } from '../../domain/errors/consent.error';
import { ConsentAuditLogPrimitives } from '../../domain/consent-audit-log.aggregate';
import { VisitorId } from '../../../visitors-v2/domain/value-objects/visitor-id';

/**
 * Query Handler para obtener audit logs de un visitante
 * GDPR Art. 15: Derecho de acceso del interesado
 */
@QueryHandler(GetVisitorAuditLogsQuery)
export class GetVisitorAuditLogsQueryHandler
  implements IQueryHandler<GetVisitorAuditLogsQuery>
{
  constructor(
    @Inject(CONSENT_AUDIT_LOG_REPOSITORY)
    private readonly repository: ConsentAuditLogRepository,
  ) {}

  async execute(
    query: GetVisitorAuditLogsQuery,
  ): Promise<Result<ConsentAuditLogPrimitives[], ConsentPersistenceError>> {
    const visitorId = VisitorId.create(query.visitorId);

    const result = await this.repository.findByVisitorId(visitorId);

    if (result.isErr()) {
      return err(result.error);
    }

    const primitives = result.value.map((auditLog) => auditLog.toPrimitives());

    return ok(primitives);
  }
}
