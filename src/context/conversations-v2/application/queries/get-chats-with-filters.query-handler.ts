import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetChatsWithFiltersQuery } from './get-chats-with-filters.query';
import { Chat } from '../../domain/entities/chat';
import { Inject, Logger } from '@nestjs/common';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../domain/chat.repository';
import { base64ToCursor } from 'src/context/shared/domain/cursor/base64-to-cursor.util';
import { cursorToBase64 } from 'src/context/shared/domain/cursor/cursor-to-base64.util';
import { ChatListResponseDto } from '../dtos/chat-response.dto';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Handler para obtener chats con filtros avanzados y paginación con cursor
 */
@QueryHandler(GetChatsWithFiltersQuery)
export class GetChatsWithFiltersQueryHandler
  implements IQueryHandler<GetChatsWithFiltersQuery, ChatListResponseDto>
{
  private readonly logger = new Logger(GetChatsWithFiltersQueryHandler.name);

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(query: GetChatsWithFiltersQuery): Promise<ChatListResponseDto> {
    const { userId, userRole, filters, sort, cursor, limit } = query;

    this.logger.log(
      `Ejecutando query para usuario ${userId} con rol ${userRole}`,
    );

    try {
      // Construir filtros base
      const criteriaFilters: Filter<Chat>[] = [];

      // Filtros según el rol del usuario
      if (userRole === 'commercial') {
        // Los comerciales solo ven chats asignados a ellos o disponibles para ellos
        criteriaFilters.push(
          new Filter<Chat>('assignedCommercialId', Operator.EQUALS, userId),
        );
        // TODO: Agregar OR para chats disponibles
      }

      // Aplicar filtros adicionales si existen
      if (filters) {
        if (filters.status) {
          criteriaFilters.push(
            new Filter<Chat>('status', Operator.IN, filters.status),
          );
        }
        if (filters.priority) {
          criteriaFilters.push(
            new Filter<Chat>('priority', Operator.IN, filters.priority),
          );
        }
        if (filters.visitorId) {
          criteriaFilters.push(
            new Filter<Chat>('visitorId', Operator.EQUALS, filters.visitorId),
          );
        }
        if (filters.assignedCommercialId) {
          criteriaFilters.push(
            new Filter<Chat>(
              'assignedCommercialId',
              Operator.EQUALS,
              filters.assignedCommercialId,
            ),
          );
        }
        // Nota: department y hasUnreadMessages no son campos directos de la entidad Chat
        // Se podrían implementar como filtros especiales en el repositorio
        if (filters.dateFrom) {
          criteriaFilters.push(
            new Filter<Chat>(
              'createdAt',
              Operator.GREATER_OR_EQUALS,
              new Date(filters.dateFrom),
            ),
          );
        }
        if (filters.dateTo) {
          criteriaFilters.push(
            new Filter<Chat>(
              'createdAt',
              Operator.LESS_OR_EQUALS,
              new Date(filters.dateTo),
            ),
          );
        }
        // Nota: hasUnreadMessages no es un campo directo de la entidad Chat
        // Se podría implementar como filtro especial en el repositorio
      }

      // Decodificar cursor si existe
      const criteriaCursor = cursor ? base64ToCursor(cursor) : undefined;

      // Configurar ordenamiento
      let criteria = new Criteria<Chat>(criteriaFilters);

      if (sort) {
        // Mapear campos de ordenamiento a propiedades disponibles
        let sortField: keyof Chat;
        switch (sort.field) {
          case 'lastMessageDate':
            // No hay getter para lastMessageDate, usar createdAt como fallback
            sortField = 'createdAt';
            break;
          case 'createdAt':
            sortField = 'createdAt';
            break;
          case 'priority':
            sortField = 'priority';
            break;
          case 'totalMessages':
            sortField = 'totalMessages';
            break;
          default:
            sortField = 'createdAt';
        }

        criteria = criteria.orderByField(sortField, sort.direction);
      } else {
        // Ordenamiento por defecto: por fecha de creación descendente, luego por ID
        criteria = criteria
          .orderByField('createdAt', 'DESC')
          .orderByField('id', 'DESC');
      }

      criteria = criteria.setLimit(limit || 20);

      if (criteriaCursor) {
        criteria = criteria.setCursor(criteriaCursor);
      }

      // Ejecutar búsqueda
      const result: Result<Chat[], DomainError> =
        await this.chatRepository.match(criteria);

      if (result.isErr()) {
        this.logger.error(`Error al buscar chats: ${result.error.message}`);
        throw new Error(result.error.message);
      }

      const chats = result.value;

      // Calcular cursor siguiente si hay más chats
      let nextCursor: string | null = null;
      if (chats.length > 0) {
        const lastChat = chats[chats.length - 1];
        const chatPrimitives = lastChat.toPrimitives();
        nextCursor = cursorToBase64<Chat>({
          createdAt: chatPrimitives.createdAt,
          id: chatPrimitives.id,
        });
      }

      // Verificar si hay más chats disponibles
      let hasMore = false;
      if (nextCursor && chats.length === (limit || 20)) {
        const nextCriteria = new Criteria<Chat>(criteriaFilters)
          .orderByField('createdAt', 'DESC')
          .orderByField('id', 'DESC')
          .setLimit(1)
          .setCursor(base64ToCursor(nextCursor));

        const nextResult = await this.chatRepository.match(nextCriteria);
        if (nextResult.isOk()) {
          hasMore = nextResult.value.length > 0;
        }
      }

      // Obtener total de chats (sin paginación)
      const totalCriteria = new Criteria(criteriaFilters);
      const totalResult = await this.chatRepository.match(totalCriteria);
      const total = totalResult.isOk() ? totalResult.value.length : 0;

      // Mapear a DTOs de respuesta
      const chatDtos = chats.map((chat) => {
        const primitives = chat.toPrimitives();
        return {
          id: primitives.id,
          status: primitives.status,
          priority: primitives.priority,
          visitorInfo: {
            id: primitives.visitorId, // Usar el visitorId como id
            name: primitives.visitorInfo.name || '',
            email: primitives.visitorInfo.email || '',
            phone: primitives.visitorInfo.phone,
            location: primitives.visitorInfo.location
              ? `${primitives.visitorInfo.location.city || ''}, ${primitives.visitorInfo.location.country || ''}`
              : undefined,
            additionalData: {
              company: primitives.visitorInfo.company,
              ipAddress: primitives.visitorInfo.ipAddress,
              referrer: primitives.visitorInfo.referrer,
              userAgent: primitives.visitorInfo.userAgent,
            },
          },
          assignedCommercialId: primitives.assignedCommercialId,
          availableCommercialIds: primitives.availableCommercialIds,
          metadata: {
            department: primitives.metadata?.department || '',
            source: primitives.metadata?.source || '',
            initialUrl: undefined, // No disponible en ChatMetadataData
            userAgent: undefined, // No disponible en ChatMetadataData
            referrer: undefined, // No disponible en ChatMetadataData
            tags: primitives.metadata?.tags,
            customFields: primitives.metadata?.customFields,
          },
          createdAt: primitives.createdAt,
          assignedAt: undefined, // No disponible en primitives
          closedAt: primitives.closedAt,
          lastMessageDate: primitives.lastMessageDate,
          totalMessages: primitives.totalMessages,
          unreadMessagesCount: 0, // No disponible en primitives
          isActive: primitives.status !== 'CLOSED',
          visitorId: primitives.visitorId,
          department: primitives.metadata?.department || '',
          tags: [], // No disponible en primitives
          updatedAt: primitives.updatedAt,
          averageResponseTimeMinutes: primitives.responseTimeSeconds
            ? primitives.responseTimeSeconds / 60
            : undefined,
          chatDurationMinutes: undefined, // No disponible en primitives
          resolutionStatus: undefined, // No disponible en primitives
          satisfactionRating: undefined, // No disponible en primitives
        };
      });

      return {
        chats: chatDtos,
        total,
        hasMore,
        nextCursor: hasMore ? nextCursor : null,
      };
    } catch (error) {
      this.logger.error(`Error ejecutando query: ${error}`);
      throw new Error(
        `Error al obtener chats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
