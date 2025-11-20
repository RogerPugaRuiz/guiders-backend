import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger, Optional } from '@nestjs/common';
import { PresenceChangedEvent } from '../../domain/events/presence-changed.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/chat.repository';
import { VisitorId } from 'src/context/conversations-v2/domain/value-objects/visitor-id';
import { CommercialId } from 'src/context/conversations-v2/domain/value-objects/commercial-id';
import { ChatStatusEnum } from 'src/context/conversations-v2/domain/value-objects/chat-status';

/**
 * Event handler que notifica vía WebSocket cuando cambia el estado de presencia de un usuario
 *
 * Flujo optimizado:
 * 1. Escucha el evento PresenceChangedEvent
 * 2. Obtiene los datos del cambio de estado
 * 3. Si es visitante:
 *    - Consulta chats activos del visitante
 *    - Emite notificación solo a comerciales asignados a esos chats
 * 4. Si es comercial:
 *    - Consulta chats activos del comercial
 *    - Emite notificación solo a visitantes en esos chats
 * 5. Siempre emite a la sala del propio usuario para actualizaciones de estado
 */
@EventsHandler(PresenceChangedEvent)
export class NotifyPresenceChangedOnPresenceChangedEventHandler
  implements IEventHandler<PresenceChangedEvent>
{
  private readonly logger = new Logger(
    NotifyPresenceChangedOnPresenceChangedEventHandler.name,
  );

  constructor(
    @Optional()
    @Inject('WEBSOCKET_GATEWAY')
    private readonly websocketGateway: WebSocketGatewayBasic,
    @Optional()
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async handle(event: PresenceChangedEvent): Promise<void> {
    this.logger.log(
      `🔔 [PresenceChangedEvent RECIBIDO] usuario: ${event.getUserId()} | tipo: ${event.getUserType()} | ${event.getPreviousStatus()} → ${event.getNewStatus()} | tenant: ${event.getTenantId()}`,
    );

    // Si no hay websocketGateway disponible (ej: en tests), simplemente retornar
    if (!this.websocketGateway) {
      this.logger.warn(
        '⚠️ WebSocket gateway NO disponible, omitiendo notificación',
      );
      return;
    }

    try {
      const userId = event.getUserId();
      const userType = event.getUserType();
      const newStatus = event.getNewStatus();
      const previousStatus = event.getPreviousStatus();
      const timestamp = new Date().toISOString();

      // Payload común para las notificaciones
      const payload = {
        userId,
        userType,
        status: newStatus,
        previousStatus,
        timestamp,
        tenantId: event.getTenantId(), // Necesario para emitir a sala del tenant
      };

      // Siempre emitir a sala específica del usuario (para auto-actualización)
      const userRoom = `${userType}:${userId}`;
      this.logger.debug(
        `Emitiendo presence:changed a sala de usuario: ${userRoom} - Estado: ${previousStatus} → ${newStatus}`,
      );
      this.websocketGateway.emitToRoom(userRoom, 'presence:changed', payload);

      // Si es visitante, notificar a comerciales con chats activos
      if (userType === 'visitor') {
        await this.notifyCommercialsWithActiveChats(userId, payload);
      }

      // Si es comercial, notificar a visitantes con chats activos
      if (userType === 'commercial') {
        await this.notifyVisitorsWithActiveChats(userId, payload);
      }

      this.logger.debug(
        `Notificación de cambio de presencia procesada para usuario: ${userId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar cambio de presencia: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }

  /**
   * Notifica el cambio de presencia de un visitante solo a comerciales
   * que tienen chats activos con ese visitante
   */
  private async notifyCommercialsWithActiveChats(
    visitorId: string,
    payload: any,
  ): Promise<void> {
    // Si no hay chatRepository, no podemos filtrar (ej: en tests sin mock)
    if (!this.chatRepository) {
      this.logger.debug(
        'Chat repository no disponible, omitiendo notificación a comerciales',
      );
      return;
    }

    try {
      // Crear value object para la consulta
      const visitorIdVO = VisitorId.create(visitorId);

      // Consultar chats activos del visitante
      // Estados activos: PENDING, ASSIGNED, ACTIVE, TRANSFERRED
      const activeStatuses = [
        ChatStatusEnum.PENDING,
        ChatStatusEnum.ASSIGNED,
        ChatStatusEnum.ACTIVE,
        ChatStatusEnum.TRANSFERRED,
      ].map((status) => ({ value: status }));

      const chatsResult = await this.chatRepository.findByVisitorId(
        visitorIdVO,
        activeStatuses as any,
      );

      if (chatsResult.isErr()) {
        this.logger.error(
          `Error al consultar chats activos del visitante ${visitorId}: ${chatsResult.error.message}`,
        );
        return;
      }

      const activeChats = chatsResult.unwrap();

      // SOLUCIÓN: Buscar también chats cerrados recientemente (últimas 24 horas)
      // para notificar a comerciales que tuvieron interacción con el visitante
      if (activeChats.length === 0) {
        this.logger.log(
          `📢 Visitante ${visitorId} sin chats activos → Buscando chats cerrados recientemente para notificar`,
        );

        // Buscar chats cerrados en las últimas 24 horas
        const closedStatuses = [
          ChatStatusEnum.CLOSED,
          ChatStatusEnum.ABANDONED,
        ].map((status) => ({ value: status }));

        const recentChatsResult = await this.chatRepository.findByVisitorId(
          visitorIdVO,
          closedStatuses as any,
        );

        if (recentChatsResult.isOk()) {
          const recentChats = recentChatsResult.unwrap();

          // Filtrar solo chats cerrados en las últimas 24 horas
          const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
          const recentClosedChats = recentChats.filter((chat) => {
            const chatPrimitives = chat.toPrimitives();
            if (chatPrimitives.closedAt) {
              const closedTime = new Date(chatPrimitives.closedAt).getTime();
              return closedTime > twentyFourHoursAgo;
            }
            return false;
          });

          if (recentClosedChats.length > 0) {
            this.logger.log(
              `✅ Encontrados ${recentClosedChats.length} chat(s) cerrado(s) recientemente para visitante ${visitorId}`,
            );

            // Extraer comercialIds únicos
            const commercialIds = new Set<string>();
            recentClosedChats.forEach((chat) => {
              const primitives = chat.toPrimitives();
              if (primitives.assignedCommercialId) {
                commercialIds.add(primitives.assignedCommercialId);
              }
            });

            if (commercialIds.size > 0) {
              this.logger.log(
                `✅ Emitiendo presence:changed de visitante ${visitorId} (${payload.previousStatus} → ${payload.status}) a ${commercialIds.size} comercial(es) con chats recientes`,
              );

              commercialIds.forEach((commercialId) => {
                const commercialRoom = `commercial:${commercialId}`;
                this.logger.log(
                  `📤 WebSocket emit → sala: ${commercialRoom} | evento: presence:changed | visitante: ${visitorId} | estado: ${payload.previousStatus} → ${payload.status}`,
                );
                this.websocketGateway.emitToRoom(
                  commercialRoom,
                  'presence:changed',
                  payload,
                );
              });
              return;
            }
          }
        }

        this.logger.warn(
          `⚠️ Visitante ${visitorId} cambió a ${payload.status} sin chats activos ni chats cerrados recientemente, no se notifica a ningún comercial`,
        );
        return;
      }

      // Extraer comercialIds únicos de los chats activos
      const commercialIds = new Set<string>();
      activeChats.forEach((chat) => {
        const primitives = chat.toPrimitives();
        if (primitives.assignedCommercialId) {
          commercialIds.add(primitives.assignedCommercialId);
        }
      });

      if (commercialIds.size === 0) {
        this.logger.warn(
          `⚠️ Visitante ${visitorId} cambió a ${payload.status} con ${activeChats.length} chat(s) activo(s) pero SIN comerciales asignados, no se notifica`,
        );
        return;
      }

      // Emitir a cada comercial asignado
      this.logger.log(
        `✅ Emitiendo presence:changed de visitante ${visitorId} (${payload.previousStatus} → ${payload.status}) a ${commercialIds.size} comercial(es) con chats activos`,
      );

      commercialIds.forEach((commercialId) => {
        const commercialRoom = `commercial:${commercialId}`;
        this.logger.log(
          `📤 WebSocket emit → sala: ${commercialRoom} | evento: presence:changed | visitante: ${visitorId} | estado: ${payload.previousStatus} → ${payload.status}`,
        );
        this.websocketGateway.emitToRoom(
          commercialRoom,
          'presence:changed',
          payload,
        );
      });

      this.logger.debug(
        `Notificaciones enviadas a ${commercialIds.size} comercial(es) para visitante ${visitorId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar a comerciales sobre visitante ${visitorId}: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }

  /**
   * Notifica el cambio de presencia de un comercial solo a visitantes
   * que tienen chats activos con ese comercial
   */
  private async notifyVisitorsWithActiveChats(
    commercialId: string,
    payload: any,
  ): Promise<void> {
    // Si no hay chatRepository, no podemos filtrar (ej: en tests sin mock)
    if (!this.chatRepository) {
      this.logger.debug(
        'Chat repository no disponible, omitiendo notificación a visitantes',
      );
      return;
    }

    try {
      // Crear value object para la consulta
      const commercialIdVO = CommercialId.create(commercialId);

      // Consultar chats activos del comercial usando findByCommercialId
      const chatsResult = await this.chatRepository.findByCommercialId(
        commercialIdVO,
        {
          status: [
            ChatStatusEnum.PENDING,
            ChatStatusEnum.ASSIGNED,
            ChatStatusEnum.ACTIVE,
            ChatStatusEnum.TRANSFERRED,
          ],
        },
      );

      if (chatsResult.isErr()) {
        this.logger.error(
          `Error al consultar chats activos del comercial ${commercialId}: ${chatsResult.error.message}`,
        );
        return;
      }

      const searchResult = chatsResult.unwrap();
      const activeChats = searchResult.chats;

      if (activeChats.length === 0) {
        this.logger.debug(
          `Comercial ${commercialId} no tiene chats activos, no se notifica a ningún visitante`,
        );
        return;
      }

      // Extraer visitorIds únicos de los chats activos
      const visitorIds = new Set<string>();
      activeChats.forEach((chat) => {
        const primitives = chat.toPrimitives();
        visitorIds.add(primitives.visitorId);
      });

      // Emitir a cada visitante
      this.logger.debug(
        `Emitiendo presence:changed de comercial ${commercialId} a ${visitorIds.size} visitante(s) con chats activos`,
      );

      visitorIds.forEach((visitorId) => {
        const visitorRoom = `visitor:${visitorId}`;
        this.logger.debug(
          `Emitiendo a sala: ${visitorRoom} - Comercial ${commercialId} cambió estado a ${payload.status}`,
        );
        this.websocketGateway.emitToRoom(
          visitorRoom,
          'presence:changed',
          payload,
        );
      });

      this.logger.debug(
        `Notificaciones enviadas a ${visitorIds.size} visitante(s) para comercial ${commercialId}`,
      );
    } catch (error) {
      const errorObj = error as Error;
      this.logger.error(
        `Error al notificar a visitantes sobre comercial ${commercialId}: ${errorObj.message}`,
        errorObj.stack,
      );
      // No lanzamos el error para no afectar el flujo principal
    }
  }
}
