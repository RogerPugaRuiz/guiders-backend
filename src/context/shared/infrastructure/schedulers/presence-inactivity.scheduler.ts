import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventBus, CommandBus } from '@nestjs/cqrs';
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
import { ChangeVisitorConnectionStatusCommand } from '../../../visitors-v2/application/commands/change-visitor-connection-status.command';

/**
 * Scheduler que detecta usuarios inactivos y gestiona transiciones AWAY/OFFLINE
 *
 * Ejecuta cada 1 minuto y verifica la actividad de:
 * - Comerciales online/busy
 * - Visitantes online/chatting
 *
 * Lógica de detección para visitantes:
 * 1. Sin heartbeat (> PRESENCE_INACTIVITY_MINUTES, default: 5 min) → OFFLINE (sesión expirada)
 * 2. Con heartbeat pero sin interacción (> PRESENCE_USER_INACTIVITY_MINUTES, default: 1 min) → AWAY (inactivo pero navegando)
 * 3. Con heartbeat e interacción reciente → mantiene estado actual (ONLINE/CHATTING)
 *
 * Variables de entorno:
 * - PRESENCE_INACTIVITY_MINUTES: Timeout para heartbeat → OFFLINE (default: 5)
 * - PRESENCE_USER_INACTIVITY_MINUTES: Timeout para user-interaction → AWAY (default: 1)
 * - PRESENCE_INACTIVITY_ENABLED: Habilitar/deshabilitar scheduler (default: true)
 */
@Injectable()
export class PresenceInactivityScheduler {
  private readonly logger = new Logger(PresenceInactivityScheduler.name);
  private readonly isEnabled: boolean;
  private readonly inactivityMinutes: number;
  private readonly userInactivityMinutes: number;

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly commercialConnectionService: CommercialConnectionDomainService,
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly visitorConnectionService: VisitorConnectionDomainService,
    private readonly eventBus: EventBus,
    private readonly commandBus: CommandBus,
  ) {
    this.isEnabled = process.env.PRESENCE_INACTIVITY_ENABLED !== 'false';
    this.inactivityMinutes = parseInt(
      process.env.PRESENCE_INACTIVITY_MINUTES || '5', // Timeout para heartbeat → OFFLINE (sesión muerta)
      10,
    );
    this.userInactivityMinutes = parseInt(
      process.env.PRESENCE_USER_INACTIVITY_MINUTES || '1', // Timeout para user-interaction → AWAY (inactivo pero navegando)
      10,
    );

    this.logger.log(
      `Presence Inactivity Scheduler inicializado. Habilitado: ${this.isEnabled}, Heartbeat timeout: ${this.inactivityMinutes} min (→ OFFLINE), User-interaction timeout: ${this.userInactivityMinutes} min (→ AWAY)`,
    );
  }

  /**
   * Ejecuta verificación cada 1 minuto
   */
  @Cron('0 */1 * * * *')
  async handleInactivityCheck(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('⚠️ Presence inactivity check DESHABILITADO via ENV');
      return;
    }

    try {
      this.logger.log('🔍 [SCHEDULER] Iniciando verificación de inactividad');

      // Verificar comerciales
      await this.checkCommercialInactivity();

      // Verificar visitantes
      await this.checkVisitorInactivity();

      this.logger.log('✅ [SCHEDULER] Verificación de inactividad completada');
    } catch (error) {
      this.logger.error(
        `❌ [SCHEDULER] Error en verificación de inactividad: ${(error as Error).message}`,
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
      this.logger.log(
        `🔍 [SCHEDULER] Verificando inactividad de visitantes (timeout: ${this.inactivityMinutes} min)`,
      );

      // Obtener todos los visitantes online
      const onlineVisitors =
        await this.visitorConnectionService.getOnlineVisitors();

      this.logger.log(
        `📊 [SCHEDULER] Encontrados ${onlineVisitors.length} visitante(s) online`,
      );

      if (onlineVisitors.length === 0) {
        this.logger.log(
          '👍 [SCHEDULER] No hay visitantes online para verificar',
        );
        return;
      }

      let awayCount = 0;
      let offlineCount = 0;

      for (const visitorId of onlineVisitors) {
        try {
          // PASO 1: Verificar si tiene heartbeat reciente (sesión viva)
          const hasHeartbeat =
            await this.visitorConnectionService.isVisitorActive(
              visitorId,
              this.inactivityMinutes, // Timeout para heartbeat (ej: 5 min)
            );

          if (!hasHeartbeat) {
            // SIN HEARTBEAT → OFFLINE (sesión muerta)
            const currentStatus =
              await this.visitorConnectionService.getConnectionStatus(
                visitorId,
              );

            if (!currentStatus.isOffline()) {
              offlineCount++;
              this.logger.log(
                `⏰ [SCHEDULER] Sin heartbeat desde hace ${this.inactivityMinutes} min → Cambiando visitante ${visitorId.getValue()} de ${currentStatus.value} a 'offline'`,
              );

              await this.commandBus.execute(
                new ChangeVisitorConnectionStatusCommand(
                  visitorId.getValue(),
                  'offline',
                ),
              );

              this.logger.log(
                `✅ [SCHEDULER] Visitante ${visitorId.getValue()} → OFFLINE (sesión expirada)`,
              );
            }
            continue; // Siguiente visitante
          }

          // PASO 2: Heartbeat activo, verificar si hay interacción del usuario
          const hasUserInteraction =
            await this.visitorConnectionService.isUserActive(
              visitorId,
              this.userInactivityMinutes, // Timeout para user-interaction (ej: 1 min)
            );

          if (!hasUserInteraction) {
            // SIN INTERACCIÓN (pero con heartbeat) → AWAY
            const currentStatus =
              await this.visitorConnectionService.getConnectionStatus(
                visitorId,
              );

            if (!currentStatus.isAway() && !currentStatus.isOffline()) {
              awayCount++;

              const lastUserActivity =
                await this.visitorConnectionService.getLastUserActivity(
                  visitorId,
                );
              const minutesAgo = Math.floor(
                (Date.now() - lastUserActivity.value.getTime()) / 1000 / 60,
              );

              this.logger.log(
                `💤 [SCHEDULER] Sin interacción desde hace ${minutesAgo} min (pero con heartbeat) → Cambiando visitante ${visitorId.getValue()} de ${currentStatus.value} a 'away'`,
              );

              await this.commandBus.execute(
                new ChangeVisitorConnectionStatusCommand(
                  visitorId.getValue(),
                  'away',
                ),
              );

              this.logger.log(
                `✅ [SCHEDULER] Visitante ${visitorId.getValue()} → AWAY (inactivo pero navegando)`,
              );
            } else if (currentStatus.isAway()) {
              this.logger.debug(
                `⏭️  [SCHEDULER] Visitante ${visitorId.getValue()} ya está away, omitiendo`,
              );
            }
          } else {
            // CON INTERACCIÓN → Mantener estado actual (ONLINE/CHATTING)
            this.logger.debug(
              `✅ [SCHEDULER] Visitante ${visitorId.getValue()} activo (última interacción < ${this.userInactivityMinutes} min)`,
            );
          }
        } catch (error) {
          this.logger.error(
            `❌ [SCHEDULER] Error procesando visitante ${visitorId.getValue()}: ${(error as Error).message}`,
          );
        }
      }

      this.logger.log(
        `📊 [SCHEDULER] Verificación completada: ${awayCount} → AWAY, ${offlineCount} → OFFLINE`,
      );
    } catch (error) {
      this.logger.error(
        `❌ [SCHEDULER] Error al verificar inactividad de visitantes: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
