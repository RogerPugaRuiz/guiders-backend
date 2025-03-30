import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindCommercialChatsQuery } from './find-commercial-chats.query';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/chat-context/chat/domain/chat/chat.repository';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import {
  Chat,
  ChatPrimitives,
} from 'src/context/chat-context/chat/domain/chat/chat';

export interface FindCommercialChatsQueryResult {
  chats: ChatPrimitives[];
}

@QueryHandler(FindCommercialChatsQuery)
export class FindCommercialChatsQueryHandler
  implements
    IQueryHandler<FindCommercialChatsQuery, FindCommercialChatsQueryResult>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: FindCommercialChatsQuery,
  ): Promise<FindCommercialChatsQueryResult> {
    const { commercialId } = query;
    const criteria = new Criteria<Chat>().addOrFilterGroup([
      new Filter('commercialId', Operator.EQUALS, commercialId),
      new Filter('commercialId', Operator.IS_NULL),
    ]);
    const { chats } = await this.chatRepository.find(criteria);

    return { chats: chats.map((chat) => chat.toPrimitives()) };
  }
}
