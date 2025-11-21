import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { VisitorSearchParserService } from '../../infrastructure/services/visitor-search-parser.service';
import { SearchSuggestionsResponseDto } from '../dtos/visitor-search.dto';

export class GetVisitorSearchSuggestionsQuery implements IQuery {
  constructor(public readonly query: string) {}
}

@QueryHandler(GetVisitorSearchSuggestionsQuery)
export class GetVisitorSearchSuggestionsQueryHandler
  implements
    IQueryHandler<GetVisitorSearchSuggestionsQuery, SearchSuggestionsResponseDto>
{
  constructor(private readonly parserService: VisitorSearchParserService) {}

  async execute(
    query: GetVisitorSearchSuggestionsQuery,
  ): Promise<SearchSuggestionsResponseDto> {
    const suggestions = this.parserService.getSuggestions(query.query);
    return { suggestions };
  }
}
