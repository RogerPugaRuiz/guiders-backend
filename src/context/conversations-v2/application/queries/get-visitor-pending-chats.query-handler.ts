import { Injectable, Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetVisitorPendingChatsQuery } from './get-visitor-pending-chats.query';
import { PendingChatsResponseDto } from '../dtos/pending-chats-response.dto';
import { CHAT_V2_REPOSITORY, IChatRepository } from '../../domain/chat.repository';
import {
  MESSAGE_V2_REPOSITORY,
  IMessageRepository,
} from '../../domain/message.repository';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from 'src/context/visitors-v2/domain/visitor-v2.repository';
import {
  TRACKING_EVENT_REPOSITORY,
  ITrackingEventRepository,
} from 'src/context/tracking/domain/tracking-event.repository';
import { VisitorId as ChatVisitorId } from '../../domain/value-objects/visitor-id';
import { ChatId } from '../../domain/value-objects/chat-id';
import { VisitorId } from 'src/context/visitors-v2/domain/value-objects/visitor-id';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';
import { TrackingEvent } from 'src/context/tracking/domain/tracking-event.aggregate';

/**
 * Handler para la query de obtener chats pendientes de un visitante
 */
@Injectable()
@QueryHandler(GetVisitorPendingChatsQuery)
export class GetVisitorPendingChatsQueryHandler
  implements IQueryHandler<GetVisitorPendingChatsQuery>
{
  private readonly logger = new Logger(
    GetVisitorPendingChatsQueryHandler.name,
  );

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly trackingEventRepository: ITrackingEventRepository,
  ) {}

  async execute(
    query: GetVisitorPendingChatsQuery,
  ): Promise<PendingChatsResponseDto> {
    this.logger.log(
      `Obteniendo chats pendientes para visitante: ${query.visitorId}`,
    );

    const response: PendingChatsResponseDto = {
      pendingChats: [],
    };

    try {
      // Obtener información del visitante
      const visitorResult = await this.visitorRepository.findById(
        VisitorId.create(query.visitorId),
      );

      if (visitorResult.isOk()) {
        const visitor = visitorResult.unwrap();
        const visitorPrimitives = visitor.toPrimitives();
        response.visitor = {
          id: visitorPrimitives.id,
          fingerprint: visitorPrimitives.fingerprint,
        };
      }

      // Obtener chats del visitante
      const chatsResult = await this.chatRepository.findByVisitorId(
        ChatVisitorId.create(query.visitorId),
      );

      if (chatsResult.isErr()) {
        this.logger.warn(
          `No se pudieron obtener chats: ${chatsResult.error.message}`,
        );
        return response;
      }

      let chats = chatsResult.unwrap();

      // Filtrar solo chats pendientes
      let pendingChats = chats.filter(
        (chat) => chat.status.value === 'PENDING',
      );

      // Si se proporcionan chatIds, filtrar solo esos
      if (query.chatIds && query.chatIds.length > 0) {
        pendingChats = pendingChats.filter((chat) =>
          query.chatIds!.includes(chat.id.value),
        );
      }

      if (pendingChats.length === 0) {
        this.logger.log('No hay chats pendientes');
        return response;
      }

      // Construir información de chats pendientes
      const chatHistory: Record<string, any[]> = {};

      for (const chat of pendingChats) {
        const chatPrimitives = chat.toPrimitives();
        const chatId = chatPrimitives.id;

        // Calcular posición en cola (número de chats pendientes creados antes)
        const queuePositionResult =
          await this.chatRepository.countPendingCreatedBefore(
            chatPrimitives.createdAt,
            chatPrimitives.metadata?.department,
          );

        const queuePosition = queuePositionResult.isOk()
          ? queuePositionResult.unwrap() + 1
          : undefined;

        // Obtener mensajes del chat
        const messagesResult = await this.messageRepository.findByChatId(
          ChatId.create(chatId),
        );

        let lastMessage: {
          content: string;
          sentAt: string;
          senderType: string;
        } | undefined = undefined;
        let unreadCount = 0;

        if (messagesResult.isOk()) {
          const messageSearchResult = messagesResult.unwrap();
          const messages = messageSearchResult.messages;
          
          chatHistory[chatId] = messages.map((msg) => {
            const msgPrimitives = msg.toPrimitives();
            return {
              messageId: msgPrimitives.id,
              content: msgPrimitives.content,
              senderType: this.getSenderType(msgPrimitives.type),
              sentAt: msgPrimitives.createdAt.toISOString(),
            };
          });

          // Último mensaje
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const lastMsgPrimitives = lastMsg.toPrimitives();
            lastMessage = {
              content: lastMsgPrimitives.content,
              sentAt: lastMsgPrimitives.createdAt.toISOString(),
              senderType: this.getSenderType(lastMsgPrimitives.type),
            };
          }

          // Contar mensajes no leídos (simplificado: todos los mensajes del visitante)
          unreadCount = messages.filter(
            (msg) => msg.toPrimitives().type === 'VISITOR',
          ).length;
        }

        response.pendingChats.push({
          chatId: chatId,
          status: chatPrimitives.status,
          priority: chatPrimitives.priority,
          department: chatPrimitives.metadata?.department,
          subject:
            typeof chatPrimitives.metadata?.customFields?.subject === 'string'
              ? chatPrimitives.metadata.customFields.subject
              : undefined,
          queuePosition,
          estimatedWaitTime: queuePosition ? queuePosition * 60 : undefined, // 1 minuto por posición
          createdAt: chatPrimitives.createdAt.toISOString(),
          lastMessage,
          unreadCount,
        });
      }

      if (Object.keys(chatHistory).length > 0) {
        response.chatHistory = chatHistory;
      }

      // Obtener actividades del visitante
      const visitorIdFilter = new Filter<TrackingEvent>(
        'visitorId' as keyof TrackingEvent,
        Operator.EQUALS,
        query.visitorId,
      );
      const trackingCriteria = new Criteria<TrackingEvent>([visitorIdFilter]);

      const activitiesResult =
        await this.trackingEventRepository.match(trackingCriteria);

      if (activitiesResult.isOk()) {
        const activities = activitiesResult.unwrap();
        response.visitorActivity = activities.map((activity) => {
          const activityPrimitives = activity.toPrimitives();
          return {
            activityId: activityPrimitives.id,
            type: activityPrimitives.eventType,
            description: this.getActivityDescription(
              activityPrimitives.eventType,
              activityPrimitives.metadata,
            ),
            timestamp: activityPrimitives.occurredAt.toISOString(),
            metadata: activityPrimitives.metadata,
          };
        });
      }
    } catch (error) {
      this.logger.error('Error al obtener chats pendientes:', error);
    }

    return response;
  }

  /**
   * Mapea el tipo de mensaje a tipo de remitente
   */
  private getSenderType(messageType: string): string {
    if (messageType === 'VISITOR') return 'VISITOR';
    if (messageType === 'SYSTEM') return 'SYSTEM';
    return 'AGENT';
  }

  /**
   * Genera una descripción legible de la actividad
   */
  private getActivityDescription(
    eventType: string,
    metadata: Record<string, any>,
  ): string {
    if (eventType === 'page_view' && metadata.page) {
      return `Visitó página ${metadata.page}`;
    }
    if (eventType === 'form_submission') {
      return 'Envió un formulario';
    }
    if (eventType === 'button_click') {
      return 'Hizo clic en un botón';
    }
    return `Evento: ${eventType}`;
  }
}
