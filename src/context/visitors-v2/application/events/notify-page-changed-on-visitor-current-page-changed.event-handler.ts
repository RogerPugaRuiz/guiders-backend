import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { VisitorCurrentPageChangedEvent } from '../../domain/events/visitor-current-page-changed.event';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../conversations-v2/domain/chat.repository';
import { VisitorId } from '../../../conversations-v2/domain/value-objects/visitor-id';
import { ChatStatus as ChatStatusEnum } from '../../../conversations-v2/domain/value-objects/chat-status';
import { WebSocketGatewayBasic } from '../../../../websocket/websocket.gateway';

/**
 * Event handler que notifica a los comerciales vía WebSocket
 * cuando un visitante con chat asociado cambia de página
 */
@EventsHandler(VisitorCurrentPageChangedEvent)
export class NotifyPageChangedOnVisitorCurrentPageChangedEventHandler
  implements IEventHandler<VisitorCurrentPageChangedEvent>
{
  private readonly logger = new Logger(
    NotifyPageChangedOnVisitorCurrentPageChangedEventHandler.name,
  );

  constructor(
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
  ) {}

  async handle(event: VisitorCurrentPageChangedEvent): Promise<void> {
    const { visitorId, previousPage, currentPage, timestamp } =
      event.attributes;

    this.logger.log(
      `📍 Visitante ${visitorId} cambió de página: ${previousPage || '(ninguna)'} → ${currentPage}`,
    );

    try {
      // Buscar chats activos del visitante
      const chatVisitorId = VisitorId.create(visitorId);
      const activeStatuses = [
        ChatStatusEnum.PENDING,
        ChatStatusEnum.ASSIGNED,
        ChatStatusEnum.ACTIVE,
        ChatStatusEnum.TRANSFERRED,
      ];

      const chatsResult = await this.chatRepository.findByVisitorId(
        chatVisitorId,
        activeStatuses,
      );

      if (chatsResult.isErr()) {
        this.logger.warn(
          `No se pudieron obtener chats del visitante ${visitorId}: ${chatsResult.error.message}`,
        );
        return;
      }

      const chats = chatsResult.unwrap();

      if (chats.length === 0) {
        this.logger.debug(
          `Visitante ${visitorId} no tiene chats activos, no se notificará`,
        );
        return;
      }

      // Notificar a cada comercial asignado
      const notifiedCommercials = new Set<string>();

      for (const chat of chats) {
        const primitives = chat.toPrimitives();
        const commercialId = primitives.assignedCommercialId;

        if (!commercialId) {
          continue;
        }

        // Evitar notificar al mismo comercial múltiples veces
        if (notifiedCommercials.has(commercialId)) {
          continue;
        }

        notifiedCommercials.add(commercialId);

        // Emitir evento WebSocket al comercial
        const payload = {
          visitorId,
          chatId: primitives.id,
          previousPage,
          currentPage,
          timestamp,
        };

        this.websocketGateway.emitToRoom(
          `commercial:${commercialId}`,
          'visitor:page-changed',
          payload,
        );

        this.logger.debug(
          `✅ Notificado comercial ${commercialId} sobre cambio de página del visitante ${visitorId}`,
        );
      }

      if (notifiedCommercials.size > 0) {
        this.logger.log(
          `📢 Notificados ${notifiedCommercials.size} comercial(es) sobre cambio de página`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error al notificar cambio de página del visitante ${visitorId}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
