import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindChatListWithFiltersQuery } from './find-chat-list-with-filters.query';
import { Chat, ChatPrimitives } from '../../domain/chat/chat';
import { Inject } from '@nestjs/common';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../domain/chat/chat.repository';

@QueryHandler(FindChatListWithFiltersQuery)
export class FindChatListWithFiltersQueryHandler
  implements
    IQueryHandler<FindChatListWithFiltersQuery, { chats: ChatPrimitives[] }>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: FindChatListWithFiltersQuery,
  ): Promise<{ chats: ChatPrimitives[] }> {
    const { participantId, limit } = query;

    // Crear criterios de búsqueda para encontrar chats donde el usuario es participante
    const criteria = new Criteria<Chat>()
      .addFilter('participants', Operator.EQUALS, participantId)
      .setLimit(limit || 50); // Límite por defecto de 50

    const { chats } = await this.chatRepository.find(criteria);

    return {
      chats: chats.map((chat) => chat.toPrimitives()),
    };
  }
}
