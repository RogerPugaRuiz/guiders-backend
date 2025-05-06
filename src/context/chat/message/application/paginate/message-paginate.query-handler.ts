import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MessagePaginateQuery } from './message-paginate.query';
import { Result } from 'src/context/shared/domain/result';
import {
  Message,
  MessagePrimitives,
} from 'src/context/chat/message/domain/message';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/message.repository';
import { Inject, Logger } from '@nestjs/common';
// Importaciones necesarias para criteria y utilidades de cursor
import { Filter, Operator, Criteria } from 'src/context/shared/domain/criteria';
import { ok, err } from 'src/context/shared/domain/result';
import { PaginateError } from '../../domain/errors';
import { base64ToCursor } from 'src/context/shared/domain/cursor/base64-to-cursor.util';
import { cursorToBase64 } from 'src/context/shared/domain/cursor/cursor-to-base64.util';

export type MessagePaginateQueryResult = Result<
  {
    messages: MessagePrimitives[];
    total: number;
    cursor: string;
  },
  PaginateError
>;

@QueryHandler(MessagePaginateQuery)
export class MessagePaginateQueryHandler
  implements IQueryHandler<MessagePaginateQuery, MessagePaginateQueryResult>
{
  private readonly logger = new Logger(MessagePaginateQueryHandler.name);
  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}
  async execute(
    query: MessagePaginateQuery,
  ): Promise<MessagePaginateQueryResult> {
    // Extraer parámetros de la query
    const { chatId, cursor, limit } = query;
    try {
      // Construir filtros para el chatId
      const filters: Filter<Message>[] = [
        // Filtrar por chatId
        new Filter<Message>('chatId', Operator.EQUALS, chatId),
      ];

      // Decodificar el cursor si existe
      const criteriaCursor = cursor ? base64ToCursor(cursor) : undefined;

      // comprobar los tipos dentro de criteriaCursor
      console.log(criteriaCursor);

      // Determinar la dirección de ordenación (puede venir de la query o del cursor)
      const orderDirection = criteriaCursor?.direction || 'DESC';

      // Construir criteria con filtros, orden, limit y cursor
      let criteria = new Criteria<Message>(filters)
        .orderByField('createdAt', orderDirection as 'DESC' | 'ASC')
        .setLimit(limit ?? 10);
      if (criteriaCursor) {
        criteria = criteria.setCursor(criteriaCursor);
      }

      // Buscar mensajes
      const { messages } = await this.messageRepository.find(criteria);
      // Mapear a primitives
      const messagesPrimitives = messages.map((m) => m.toPrimitives());

      // Calcular el nuevo cursor (si hay más mensajes)
      let newCursor = '';
      if (messages.length > 0) {
        // El último mensaje es el nuevo cursor, incluyendo direction
        newCursor = cursorToBase64<Message>({
          createdAt: messages[messages.length - 1].createdAt.value,
          id: messages[messages.length - 1].id.value,
        });
      }

      // Si no hay mensajes y no hay cursor, retornar el mismo cursor
      if (!newCursor && cursor) {
        return ok({
          messages: [],
          total: 0,
          hasMore: false,
          cursor: cursor,
        });
      }

      // Obtener el total de mensajes (sin paginación)
      // Se puede optimizar si el repositorio soporta count, aquí se asume que lo hace por find con limit alto
      const totalCriteria = new Criteria(filters);
      const { messages: allMessages } =
        await this.messageRepository.find(totalCriteria);
      const total = allMessages.length;

      // Retornar resultado exitoso
      return ok({
        messages: messagesPrimitives,
        total,
        cursor: newCursor,
        hasMore: newCursor !== '',
      });
    } catch (error) {
      this.logger.error(`Error paginando mensajes: ${error}`);
      // Envolver el error de dominio
      return err(new PaginateError());
    }
  }
}
