import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindChatByVisitorQuery } from '../queries/find-chat-by-visitor.query';
import { Inject } from '@nestjs/common';
import { CHAT_REPOSITORY, IChatRepository } from '../../domain/chat.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { Chat } from '../../domain/chat';

export interface FindChatByVisitorQueryResponse {
  chat?: {
    chatId: string;
    visitorId: string;
    commercialId: string | null;
    status: string;
  };
}

@QueryHandler(FindChatByVisitorQuery)
export class FindChatByVisitorQueryHandler
  implements
    IQueryHandler<FindChatByVisitorQuery, FindChatByVisitorQueryResponse>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly repository: IChatRepository,
  ) {}

  async execute(
    query: FindChatByVisitorQuery,
  ): Promise<FindChatByVisitorQueryResponse> {
    const criteria = new Criteria<Chat>().addFilter(
      'visitorId',
      Operator.EQUALS,
      query.visitorId,
    );
    const chat = await this.repository.findOne(criteria);
    return chat.fold(
      (): FindChatByVisitorQueryResponse => ({}),
      (chat): FindChatByVisitorQueryResponse => ({
        chat: {
          chatId: chat.id.value,
          visitorId: chat.visitorId.value,
          commercialId: chat.commercialId.map((id) => id.value).getOrNull(),
          status: chat.status.value,
        },
      }),
    );
  }
}
