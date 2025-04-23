import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MessagePaginateQuery } from './message-paginate.query';
import { Result } from 'src/context/shared/domain/result';
import {
  Message,
  MessagePrimitives,
} from 'src/context/chat-context/message/domain/message';
import {
  IMessageRepository,
  MESSAGE_REPOSITORY,
} from '../../domain/message.repository';
import { Inject, Logger } from '@nestjs/common';
// Importaciones necesarias para criteria y utilidades de cursor
import { Filter, Operator, Criteria } from 'src/context/shared/domain/criteria';
import { base64ToCursor } from 'src/context/shared/infrastructure/utils/base64-to-cursor.util';
import { cursorToBase64 } from 'src/context/shared/infrastructure/utils/cursor-to-base64.util';
import { ok, err } from 'src/context/shared/domain/result';
import { PaginateEndOfStreamError, PaginateError } from '../../domain/errors';
export type MessagePaginateQueryResult = Result<
  {
    messages: MessagePrimitives[];
    total: number;
    cursor: string;
  },
  PaginateError | PaginateEndOfStreamError
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
      const criteriaCursor = base64ToCursor<Message>(cursor);

      // Construir criteria con filtros, orden, limit y cursor
      let criteria = new Criteria<Message>(filters)
        .orderByField('createdAt', 'DESC')
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
        // El último mensaje es el nuevo cursor
        newCursor = cursorToBase64<Message>({
          field: 'createdAt',
          value: messages[messages.length - 1].createdAt,
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
      });
    } catch (error) {
      this.logger.error(`Error paginando mensajes: ${error}`);
      // Envolver el error de dominio
      return err(new PaginateError());
    }
  }
}
