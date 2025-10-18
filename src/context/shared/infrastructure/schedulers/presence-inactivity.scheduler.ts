import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventBus } from '@nestjs/cqrs';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../../commercial/domain/commercial-connection.domain-service';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../../visitors-v2/domain/visitor-connection.domain-service';
import { PresenceChangedEvent } from '../../domain/events/presence-changed.event';
import { CommercialConnectionStatus } from '../../../commercial/domain/value-objects/commercial-connection-status';

/**
 * Scheduler que detecta usuarios inactivos y cambia su estado a 'away'
 *
 * Ejecuta cada 1 minuto y verifica la última actividad de:
 * - Comerciales online/busy
 * - Visitantes online/chatting
 *
 * Si detecta >5 minutos de inactividad, cambia el estado a 'away'
 */
@Injectable()
export class PresenceInactivityScheduler {
  private readonly logger = new Logger(PresenceInactivityScheduler.name);
  private readonly isEnabled: boolean;
  private readonly inactivityMinutes: number;

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly commercialConnectionService: CommercialConnectionDomainService,
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly visitorConnectionService: VisitorConnectionDomainService,
    private readonly eventBus: EventBus,
  ) {
    this.isEnabled = process.env.PRESENCE_INACTIVITY_ENABLED !== 'false';
    this.inactivityMinutes = parseInt(
      process.env.PRESENCE_INACTIVITY_MINUTES || '5',
      10,
    );

    this.logger.log(
      `Presence Inactivity Scheduler inicializado. Habilitado: ${this.isEnabled}, Timeout: ${this.inactivityMinutes} minutos`,
    );
  }

  /**
   * Ejecuta verificación cada 1 minuto
   */
  @Cron('0 */1 * * * *')
  async handleInactivityCheck(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Presence inactivity check deshabilitado via ENV');
      return;
    }

    try {
      this.logger.debug('🔍 Iniciando verificación de inactividad');

      // Verificar comerciales
      await this.checkCommercialInactivity();

      // Verificar visitantes
      await this.checkVisitorInactivity();

      this.logger.debug('✅ Verificación de inactividad completada');
    } catch (error) {
      this.logger.error(
        `Error en verificación de inactividad: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  private async checkCommercialInactivity(): Promise<void> {
    try {
      // Obtener todos los comerciales online
      const onlineCommercials =
        await this.commercialConnectionService.getOnlineCommercials();

      for (const commercialId of onlineCommercials) {
        // Verificar si está activo según el timeout
        const isActive =
          await this.commercialConnectionService.isCommercialActive(
            commercialId,
            this.inactivityMinutes,
          );

        if (!isActive) {
          // Obtener estado actual
          const currentStatus =
            await this.commercialConnectionService.getConnectionStatus(
              commercialId,
            );

          // Solo cambiar a away si no está ya away u offline
          if (!currentStatus.isAway() && !currentStatus.isOffline()) {
            this.logger.log(
              `Cambiando comercial ${commercialId.value} a estado 'away' por inactividad`,
            );

            const previousStatus = currentStatus.value;

            // Cambiar a away
            await this.commercialConnectionService.setConnectionStatus(
              commercialId,
              CommercialConnectionStatus.away(),
            );

            // Emitir evento de cambio de presencia
            this.eventBus.publish(
              new PresenceChangedEvent(
                commercialId.value,
                'commercial',
                previousStatus,
                'away',
              ),
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error al verificar inactividad de comerciales: ${(error as Error).message}`,
      );
    }
  }

  private async checkVisitorInactivity(): Promise<void> {
    try {
      // Obtener todos los visitantes online
      const onlineVisitors =
        await this.visitorConnectionService.getOnlineVisitors();

      for (const visitorId of onlineVisitors) {
        // Verificar si está activo según el timeout
        const isActive = await this.visitorConnectionService.isVisitorActive(
          visitorId,
          this.inactivityMinutes,
        );

        if (!isActive) {
          // Obtener estado actual
          const currentStatus =
            await this.visitorConnectionService.getConnectionStatus(visitorId);

          // Solo cambiar a away si no está ya away u offline
          if (!currentStatus.isAway() && !currentStatus.isOffline()) {
            this.logger.log(
              `Cambiando visitante ${visitorId.getValue()} a estado 'away' por inactividad`,
            );

            const previousStatus = currentStatus.getValue();

            // Cambiar a away
            const newStatus = currentStatus.goAway();
            await this.visitorConnectionService.setConnectionStatus(
              visitorId,
              newStatus,
            );

            // Emitir evento de cambio de presencia
            this.eventBus.publish(
              new PresenceChangedEvent(
                visitorId.getValue(),
                'visitor',
                previousStatus,
                'away',
              ),
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error al verificar inactividad de visitantes: ${(error as Error).message}`,
      );
    }
  }
}
