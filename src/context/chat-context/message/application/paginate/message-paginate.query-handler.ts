import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MessagePaginateQuery } from './message-paginate.query';
import { Result } from 'src/context/shared/domain/result';
import { MessagePrimitives } from 'src/context/chat-context/message/domain/message';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/message.repository';
import { Inject } from '@nestjs/common';
import { ChatId } from 'src/context/chat-context/chat/domain/chat/value-objects/chat-id';
import {
  DomainErrorWrapper,
  DomainErrorWrapperBuilder,
} from 'src/context/shared/domain/wrapper-error';

export type MessagePaginateQueryResult = Result<
  {
    messages: MessagePrimitives[];
    total: number;
    index: string;
  },
  DomainErrorWrapper
>;

@QueryHandler(MessagePaginateQuery)
export class MessagePaginateQueryHandler
  implements IQueryHandler<MessagePaginateQuery, MessagePaginateQueryResult>
{
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}
  async execute(
    query: MessagePaginateQuery,
  ): Promise<MessagePaginateQueryResult> {
    const { chatId, index, limit } = query;

    const paginator = await this.messageRepository.findPaginated(
      ChatId.create(chatId),
      index,
      limit,
    );

    const wrapperErrorBuilder = DomainErrorWrapperBuilder.create();

    return paginator
      .mapError((error) => {
        wrapperErrorBuilder.add(error);
        return wrapperErrorBuilder.build();
      })
      .map((result) => {
        return {
          messages: result.messages.map((message) => message.toPrimitives()),
          total: result.total,
          index: result.index,
        };
      });
  }
}
