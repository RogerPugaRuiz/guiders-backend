import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVisitorConnectionStatusQuery } from './get-visitor-connection-status.query';
import { Inject } from '@nestjs/common';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../domain/visitor-connection.domain-service';
import { VisitorId } from '../../domain/value-objects/visitor-id';

@QueryHandler(GetVisitorConnectionStatusQuery)
export class GetVisitorConnectionStatusQueryHandler
  implements IQueryHandler<GetVisitorConnectionStatusQuery>
{
  constructor(
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
  ) {}

  async execute(query: GetVisitorConnectionStatusQuery): Promise<string> {
    const id = new VisitorId(query.visitorId);
    const status = await this.connectionService.getConnectionStatus(id);
    return status.getValue();
  }
}
