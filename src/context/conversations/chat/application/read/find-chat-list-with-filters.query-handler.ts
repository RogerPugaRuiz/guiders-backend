import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindChatListWithFiltersQuery } from './find-chat-list-with-filters.query';
import { Chat, ChatPrimitives } from '../../domain/chat/chat';
import { Inject } from '@nestjs/common';
import { Criteria, Operator, Filter } from 'src/context/shared/domain/criteria';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../../domain/chat/chat.repository';
import { base64ToCursor } from 'src/context/shared/domain/cursor/base64-to-cursor.util';
import { cursorToBase64 } from 'src/context/shared/domain/cursor/cursor-to-base64.util';

export interface ChatListResponse {
  chats: ChatPrimitives[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

@QueryHandler(FindChatListWithFiltersQuery)
export class FindChatListWithFiltersQueryHandler
  implements IQueryHandler<FindChatListWithFiltersQuery, ChatListResponse>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: FindChatListWithFiltersQuery,
  ): Promise<ChatListResponse> {
    const { participantId, limit, cursor } = query;

    // Construir filtros para encontrar chats donde el usuario es participante
    const filters: Filter<Chat>[] = [
      new Filter<Chat>('participants', Operator.EQUALS, participantId),
    ];

    // Decodificar el cursor si existe
    const criteriaCursor = cursor ? base64ToCursor(cursor) : undefined;

    // Construir criteria con filtros, orden, limit y cursor
    let criteria = new Criteria<Chat>(filters)
      .orderByField('lastMessageAt', 'DESC')
      .orderByField('id', 'DESC') // Añadir id como orden secundario para consistencia
      .setLimit(limit || 50);

    if (criteriaCursor) {
      criteria = criteria.setCursor(criteriaCursor);
    }

    const { chats } = await this.chatRepository.find(criteria);

    // Calcular el nuevo cursor (si hay más chats)
    let nextCursor: string | null = null;
    if (chats.length > 0) {
      const lastChat = chats[chats.length - 1];
      nextCursor = cursorToBase64<Chat>({
        lastMessageAt: lastChat.lastMessageAt?.value || null,
        id: lastChat.id.value,
      });
    }

    // Determinar si hay más chats disponibles
    // Para esto, intentamos obtener un chat más con el cursor
    let hasMore = false;
    if (nextCursor && chats.length === (limit || 50)) {
      const nextCriteria = new Criteria<Chat>(filters)
        .orderByField('lastMessageAt', 'DESC')
        .orderByField('id', 'DESC')
        .setLimit(1)
        .setCursor(base64ToCursor(nextCursor));

      const { chats: nextChats } = await this.chatRepository.find(nextCriteria);
      hasMore = nextChats.length > 0;
    }

    // Obtener el total de chats (sin paginación)
    const totalCriteria = new Criteria(filters);
    const { chats: allChats } = await this.chatRepository.find(totalCriteria);
    const total = allChats.length;

    return {
      chats: chats.map((chat) => chat.toPrimitives()),
      total,
      hasMore,
      nextCursor: hasMore ? nextCursor : null,
    };
  }
}
