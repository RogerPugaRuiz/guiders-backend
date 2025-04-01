import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetChatByVisitorIdQuery } from './get-chat-by-visitor-id.query';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from 'src/context/chat-context/chat/domain/chat/chat.repository';
import { err, ok, Result } from 'src/context/shared/domain/result';
import {
  Chat,
  ChatPrimitives,
} from 'src/context/chat-context/chat/domain/chat/chat';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ChatNotFoundError } from 'src/context/chat-context/chat/domain/chat/errors/errors';

export type GetChatByVisitorIdQueryResult = Result<
  {
    chat: ChatPrimitives;
  },
  ChatNotFoundError
>;

@QueryHandler(GetChatByVisitorIdQuery)
export class GetChatByVisitorIdQueryHandler
  implements
    IQueryHandler<GetChatByVisitorIdQuery, GetChatByVisitorIdQueryResult>
{
  constructor(
    @Inject(CHAT_REPOSITORY) private readonly chatRepository: IChatRepository,
  ) {}
  async execute(
    query: GetChatByVisitorIdQuery,
  ): Promise<GetChatByVisitorIdQueryResult> {
    const { visitorId } = query;
    const criteria = new Criteria<Chat>().addFilter(
      'visitorId',
      Operator.EQUALS,
      visitorId,
    );
    const optionalChat = await this.chatRepository.findOne(criteria);
    return optionalChat.fold(
      () => {
        return err(new ChatNotFoundError());
      },
      ({ chat }) => {
        return ok({
          chat: chat.toPrimitives(),
        });
      },
    );
  }
}
