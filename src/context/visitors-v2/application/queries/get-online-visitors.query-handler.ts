import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOnlineVisitorsQuery } from './get-online-visitors.query';
import { Inject } from '@nestjs/common';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../domain/visitor-connection.domain-service';

@QueryHandler(GetOnlineVisitorsQuery)
export class GetOnlineVisitorsQueryHandler
  implements IQueryHandler<GetOnlineVisitorsQuery>
{
  constructor(
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
  ) {}

  async execute(): Promise<string[]> {
    const ids = await this.connectionService.getOnlineVisitors();
    return ids.map((id) => id.getValue());
  }
}
