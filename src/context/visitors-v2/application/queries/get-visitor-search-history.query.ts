import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VisitorSearchHistory,
  VisitorSearchHistoryDocument,
} from '../../infrastructure/persistence/entity/visitor-search-history.entity';
import { SearchHistoryResponseDto } from '../dtos/visitor-search.dto';

export class GetVisitorSearchHistoryQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}

@QueryHandler(GetVisitorSearchHistoryQuery)
export class GetVisitorSearchHistoryQueryHandler
  implements
    IQueryHandler<GetVisitorSearchHistoryQuery, SearchHistoryResponseDto>
{
  constructor(
    @InjectModel(VisitorSearchHistory.name)
    private readonly historyModel: Model<VisitorSearchHistoryDocument>,
  ) {}

  async execute(
    query: GetVisitorSearchHistoryQuery,
  ): Promise<SearchHistoryResponseDto> {
    const history = await this.historyModel
      .find({
        tenantId: query.tenantId,
        userId: query.userId,
      })
      .sort({ executedAt: -1 })
      .limit(20)
      .lean()
      .exec();

    return {
      history: history.map((item) => ({
        id: item.id,
        query: item.query,
        resultsCount: item.resultsCount,
        executedAt: item.executedAt,
      })),
    };
  }
}
