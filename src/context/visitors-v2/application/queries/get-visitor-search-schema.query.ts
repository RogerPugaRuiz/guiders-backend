import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { VisitorSearchParserService } from '../../infrastructure/services/visitor-search-parser.service';
import { SearchSchemaResponseDto } from '../dtos/visitor-search.dto';

export class GetVisitorSearchSchemaQuery implements IQuery {}

@QueryHandler(GetVisitorSearchSchemaQuery)
export class GetVisitorSearchSchemaQueryHandler
  implements IQueryHandler<GetVisitorSearchSchemaQuery, SearchSchemaResponseDto>
{
  constructor(private readonly parserService: VisitorSearchParserService) {}

  async execute(): Promise<SearchSchemaResponseDto> {
    return this.parserService.getSchema();
  }
}
