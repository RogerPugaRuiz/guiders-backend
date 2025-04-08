import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOneChatByIdQuery } from './find-one-chat-by-id.query';
import { err, ok, Result } from 'src/context/shared/domain/result';
import { Chat, ChatPrimitives } from '../../../domain/chat/chat';
import { Inject } from '@nestjs/common';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../../domain/chat/chat.repository';
import { ChatNotFoundError } from '../../../domain/chat/errors/errors';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

@QueryHandler(FindOneChatByIdQuery)
export class FindOneChatByIdQueryHandler
  implements
    IQueryHandler<
      FindOneChatByIdQuery,
      Result<{ chat: ChatPrimitives }, ChatNotFoundError>
    >
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: FindOneChatByIdQuery,
  ): Promise<Result<{ chat: ChatPrimitives }, ChatNotFoundError>> {
    const { chatId } = query;
    const criteria = new Criteria<Chat>().addFilter(
      'id',
      Operator.EQUALS,
      chatId,
    );

    const chatOptional = await this.chatRepository.findOne(criteria);

    if (chatOptional.isEmpty()) {
      err(new ChatNotFoundError());
    }

    const chat = chatOptional
      .map(({ chat }) => {
        return chat.toPrimitives();
      })
      .get();
    return ok({ chat });
  }
}
