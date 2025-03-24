import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ExistsChatQuery } from '../queries/exists-chat.query';
import {
  ExistsChatUseCase,
  ExistsChatUseCaseResponse,
} from '../usecases/exists-chat.usecase';

export type ExistsChatQueryHandlerResponse = ExistsChatUseCaseResponse;

@QueryHandler(ExistsChatQuery)
export class ExistsChatQueryHandler
  implements IQueryHandler<ExistsChatQuery, ExistsChatUseCaseResponse>
{
  constructor(private readonly useCase: ExistsChatUseCase) {}

  async execute(
    query: ExistsChatQuery,
  ): Promise<ExistsChatQueryHandlerResponse> {
    return await this.useCase.execute(query.chatId);
  }
}
