import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindNewChatsQuery } from '../queries/find-new-chats.query';
import {
  FindNewChatsUseCase,
  FindNewChatsUseCaseResponse,
} from '../usecases/find-new-chats.usecase';

@QueryHandler(FindNewChatsQuery)
export class FindNewChatsQueryHandler
  implements IQueryHandler<FindNewChatsQuery, FindNewChatsUseCaseResponse>
{
  constructor(private readonly service: FindNewChatsUseCase) {}

  async execute(): Promise<FindNewChatsUseCaseResponse> {
    return await this.service.execute();
  }
}
