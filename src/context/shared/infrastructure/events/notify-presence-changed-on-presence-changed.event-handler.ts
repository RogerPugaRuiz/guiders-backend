import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger, Optional } from '@nestjs/common';
import { PresenceChangedEvent } from '../../domain/events/presence-changed.event';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';

/**
 * Event handler que notifica vía WebSocket cuando cambia el estado de presencia de un usuario
 *
 * Flujo:
 * 1. Escucha el evento PresenceChangedEvent
 * 2. Obtiene los datos del cambio de estado
 * 3. Emite notificación broadcast a salas relevantes
 * 4. Los clientes actualizan su UI con el nuevo estado
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
  ) {}

  handle(event: PresenceChangedEvent): void {
    this.logger.debug(
      `Procesando cambio de presencia: usuario ${event.getUserId()} (${event.getUserType()}) de ${event.getPreviousStatus()} a ${event.getNewStatus()}`,
    );

    // Si no hay websocketGateway disponible (ej: en tests), simplemente retornar
    if (!this.websocketGateway) {
      this.logger.debug(
        'WebSocket gateway no disponible, omitiendo notificación',
      );
      return;
    }

    try {
      const userId = event.getUserId();
      const userType = event.getUserType();
      const newStatus = event.getNewStatus();
      const tenantId = event.getTenantId();

      // Emitir a sala específica del usuario
      const userRoom = `${userType}:${userId}`;
      this.websocketGateway.emitToRoom(userRoom, 'presence:changed', {
        userId,
        userType,
        status: newStatus,
        previousStatus: event.getPreviousStatus(),
        timestamp: new Date().toISOString(),
      });

      // Si hay tenantId, también emitir a la sala del tenant para que
      // todos los usuarios de la empresa vean el cambio
      if (tenantId) {
        const tenantRoom = `tenant:${tenantId}`;
        this.websocketGateway.emitToRoom(tenantRoom, 'presence:changed', {
          userId,
          userType,
          status: newStatus,
          previousStatus: event.getPreviousStatus(),
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.debug(
        `Notificación de cambio de presencia enviada para usuario: ${userId}`,
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
}
