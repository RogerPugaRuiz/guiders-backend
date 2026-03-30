import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../../visitors-v2/domain/visitor-connection.domain-service';
import { ChangeVisitorConnectionStatusCommand } from '../../../visitors-v2/application/commands/change-visitor-connection-status.command';

/**
 * Scheduler simplificado que detecta visitantes inactivos y gestiona transición ONLINE → AWAY
 *
 * NOTA: La detección de OFFLINE ahora la maneja el WebSocket gateway directamente
 * cuando el cliente se desconecta (ping timeout). Este scheduler solo verifica
 * la interacción del usuario para la transición a AWAY.
 *
 * Ejecuta cada 1 minuto y verifica:
 * - Visitantes online/chatting sin interacción reciente → AWAY
 *
 * Variables de entorno:
 * - PRESENCE_USER_INACTIVITY_MINUTES: Timeout para user-interaction → AWAY (default: 2)
 * - PRESENCE_INACTIVITY_ENABLED: Habilitar/deshabilitar scheduler (default: true)
 */
@Injectable()
export class PresenceInactivityScheduler {
  private readonly logger = new Logger(PresenceInactivityScheduler.name);
  private readonly isEnabled: boolean;
  private readonly userInactivityMinutes: number;

  constructor(
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly visitorConnectionService: VisitorConnectionDomainService,
    private readonly commandBus: CommandBus,
  ) {
    this.isEnabled = process.env.PRESENCE_INACTIVITY_ENABLED !== 'false';
    this.userInactivityMinutes = parseInt(
      process.env.PRESENCE_USER_INACTIVITY_MINUTES || '2', // Timeout para user-interaction → AWAY
      10,
    );

    this.logger.log(
      `Presence Inactivity Scheduler inicializado. Habilitado: ${this.isEnabled}, User-interaction timeout: ${this.userInactivityMinutes} min (→ AWAY). NOTA: OFFLINE se detecta por WebSocket disconnect.`,
    );
  }

  /**
   * Ejecuta verificación cada 1 minuto
   * Solo verifica transición ONLINE → AWAY por falta de interacción
   */
  @Cron('0 */1 * * * *')
  async handleInactivityCheck(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Presence inactivity check deshabilitado via ENV');
      return;
    }

    try {
      await this.checkVisitorUserInactivity();
    } catch (error) {
      this.logger.error(
        `Error en verificación de inactividad: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Verifica visitantes online sin interacción reciente y los marca como AWAY
   * NOTA: Ya no verifica OFFLINE, eso lo hace el WebSocket gateway al desconectar
   */
  private async checkVisitorUserInactivity(): Promise<void> {
    try {
      // Obtener todos los visitantes online
      const onlineVisitors =
        await this.visitorConnectionService.getOnlineVisitors();

      if (onlineVisitors.length === 0) {
        this.logger.debug('📊 No hay visitantes online para verificar');
        return;
      }

      this.logger.log(
        `📊 Verificando inactividad de ${onlineVisitors.length} visitante(s) online`,
      );

      let awayCount = 0;

      for (const visitorId of onlineVisitors) {
        try {
          // Verificar si hay interacción reciente del usuario
          const hasUserInteraction =
            await this.visitorConnectionService.isUserActive(
              visitorId,
              this.userInactivityMinutes,
            );

          // Obtener última actividad para diagnóstico
          const lastActivity =
            await this.visitorConnectionService.getLastUserActivity(visitorId);

          if (!hasUserInteraction) {
            // SIN INTERACCIÓN → AWAY (conectado pero inactivo)
            const currentStatus =
              await this.visitorConnectionService.getConnectionStatus(
                visitorId,
              );

            this.logger.debug(
              `🔍 Visitante ${visitorId.getValue()} - Estado: ${currentStatus.value}, Última actividad: ${lastActivity.value.toISOString()}, Activo: ${hasUserInteraction}`,
            );

            // Solo cambiar a AWAY si está ONLINE o CHATTING (no si ya está AWAY u OFFLINE)
            if (!currentStatus.isAway() && !currentStatus.isOffline()) {
              awayCount++;

              this.logger.log(
                `💤 Visitante ${visitorId.getValue()} sin interacción > ${this.userInactivityMinutes} min → AWAY`,
              );

              await this.commandBus.execute(
                new ChangeVisitorConnectionStatusCommand(
                  visitorId.getValue(),
                  'away',
                ),
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Error procesando visitante ${visitorId.getValue()}: ${(error as Error).message}`,
          );
        }
      }

      if (awayCount > 0) {
        this.logger.log(
          `Verificación completada: ${awayCount} visitante(s) → AWAY`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error al verificar inactividad de visitantes: ${(error as Error).message}`,
      );
    }
  }
}
