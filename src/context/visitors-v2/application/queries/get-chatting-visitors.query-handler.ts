import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetChattingVisitorsQuery } from './get-chatting-visitors.query';
import { Inject } from '@nestjs/common';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../domain/visitor-connection.domain-service';

@QueryHandler(GetChattingVisitorsQuery)
export class GetChattingVisitorsQueryHandler
  implements IQueryHandler<GetChattingVisitorsQuery>
{
  constructor(
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
  ) {}

  async execute(): Promise<string[]> {
    const ids = await this.connectionService.getChattingVisitors();
    return ids.map((id) => id.getValue());
  }
}
