import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindChatListByParticipantQuery } from './find-chat-list-by-participant.query';
import { Chat, ChatPrimitives } from '../../domain/chat/chat';
import { Inject } from '@nestjs/common';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../domain/chat/chat.repository';

@QueryHandler(FindChatListByParticipantQuery)
export class FindChatListByParticipantQueryHandler
  implements
    IQueryHandler<FindChatListByParticipantQuery, { chats: ChatPrimitives[] }>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: FindChatListByParticipantQuery,
  ): Promise<{ chats: ChatPrimitives[] }> {
    const { participantId } = query;

    const criteria = new Criteria<Chat>().addFilter(
      'participants',
      Operator.EQUALS,
      participantId,
    );

    const { chats } = await this.chatRepository.find(criteria);

    return { chats: chats.map((chat) => chat.toPrimitives()) };
  }
}
