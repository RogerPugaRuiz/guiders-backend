import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VisitorSavedSearch,
  VisitorSavedSearchDocument,
} from '../../infrastructure/persistence/entity/visitor-saved-search.entity';
import { SavedSearchesResponseDto } from '../dtos/visitor-search.dto';

export class GetVisitorSavedSearchesQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
  ) {}
}

@QueryHandler(GetVisitorSavedSearchesQuery)
export class GetVisitorSavedSearchesQueryHandler
  implements
    IQueryHandler<GetVisitorSavedSearchesQuery, SavedSearchesResponseDto>
{
  constructor(
    @InjectModel(VisitorSavedSearch.name)
    private readonly savedSearchModel: Model<VisitorSavedSearchDocument>,
  ) {}

  async execute(
    query: GetVisitorSavedSearchesQuery,
  ): Promise<SavedSearchesResponseDto> {
    const savedSearches = await this.savedSearchModel
      .find({
        tenantId: query.tenantId,
        userId: query.userId,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return {
      savedSearches: savedSearches.map((item) => ({
        id: item.id,
        query: item.query,
        name: item.name,
        createdAt: item.createdAt,
      })),
    };
  }
}
