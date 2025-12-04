import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetUnreadMessagesQuery } from './get-unread-messages.query';
import { MessageResponseDto } from '../dtos/message-response.dto';
import {
  MESSAGE_REPOSITORY,
  MessageRepository,
} from '../../domain/message.repository';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import { Message } from '../../domain/entities/message.aggregate';

/**
 * Handler para obtener mensajes no leídos de un chat
 * Retorna solo los mensajes que el usuario actual no ha leído
 * (es decir, mensajes enviados por otros usuarios)
 */
@QueryHandler(GetUnreadMessagesQuery)
export class GetUnreadMessagesQueryHandler
  implements IQueryHandler<GetUnreadMessagesQuery>
{
  private readonly logger = new Logger(GetUnreadMessagesQueryHandler.name);

  constructor(
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: MessageRepository,
  ) {}

  async execute(query: GetUnreadMessagesQuery): Promise<MessageResponseDto[]> {
    this.logger.log(
      `Obteniendo mensajes no leídos del chat ${query.chatId} para usuario ${query.userId}`,
    );

    try {
      // Construir criterios de búsqueda
      const criteria = new Criteria<Message>([
        new Filter('chatId', Operator.EQUALS, query.chatId),
        new Filter('isRead', Operator.EQUALS, false),
        // Excluir mensajes del propio usuario
        new Filter('senderId', Operator.NOT_EQUALS, query.userId),
      ]);

      // Si es visitante, excluir mensajes internos
      if (query.userRole === 'visitor') {
        criteria.filters.push(new Filter('isInternal', Operator.EQUALS, false));
      }

      const result = await this.messageRepository.match(criteria);

      if (result.isErr()) {
        this.logger.error(
          `Error al obtener mensajes no leídos: ${result.error.message}`,
        );
        return [];
      }

      const messages = result.unwrap();

      // Mapear a DTOs
      return messages.map((message) => {
        const primitives = message.toPrimitives();
        return {
          id: primitives.id,
          chatId: primitives.chatId,
          senderId: primitives.senderId,
          content: primitives.content,
          type: primitives.type,
          systemData: primitives.systemData,
          attachment: primitives.attachment,
          isInternal: primitives.isInternal,
          isFirstResponse: primitives.isFirstResponse,
          isRead: primitives.isRead,
          readAt: primitives.readAt?.toISOString(),
          readBy: primitives.readBy,
          isAI: primitives.isAI,
          aiMetadata: primitives.aiMetadata,
          createdAt: primitives.createdAt.toISOString(),
          updatedAt: primitives.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      this.logger.error(
        `Error inesperado al obtener mensajes no leídos:`,
        error,
      );
      return [];
    }
  }
}
