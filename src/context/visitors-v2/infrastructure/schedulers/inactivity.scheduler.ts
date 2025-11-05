import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import {
  VisitorConnectionDomainService,
  VISITOR_CONNECTION_DOMAIN_SERVICE,
} from '../../domain/visitor-connection.domain-service';
import { CommandBus } from '@nestjs/cqrs';
import { ChangeVisitorConnectionStatusCommand } from '../../application/commands/change-visitor-connection-status.command';
import { GoOfflineVisitorCommand } from '../../application/commands/go-offline-visitor.command';
import { ConnectionStatus } from '../../domain/value-objects/visitor-connection';

/**
 * Scheduler que detecta automáticamente inactividad de visitantes
 * y actualiza su estado a "away" u "offline" según el tiempo sin actividad
 *
 * Tiempos de inactividad:
 * - 0-5 minutos: ONLINE (activo)
 * - 5-15 minutos: AWAY (inactivo pero conectado)
 * - >15 minutos: OFFLINE (desconectado)
 *
 * IMPORTANTE: Este scheduler complementa al SessionCleanupScheduler
 * - SessionCleanupScheduler: cierra sesiones expiradas según timeout del lifecycle
 * - InactivityScheduler: detecta inactividad y cambia a AWAY antes de cerrar sesión
 *
 * Frecuencia de ejecución: Cada 2 minutos
 */
@Injectable()
export class VisitorInactivityScheduler {
  private readonly logger = new Logger(VisitorInactivityScheduler.name);
  private readonly isEnabled: boolean;
  private readonly AWAY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos
  private readonly OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutos
  private isProcessing = false;

  constructor(
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
    private readonly commandBus: CommandBus,
  ) {
    this.isEnabled = process.env.PRESENCE_INACTIVITY_ENABLED !== 'false';
    this.logger.log(
      `Visitor Inactivity Scheduler inicializado. Habilitado: ${this.isEnabled}`,
    );
  }

  /**
   * Se ejecuta cada 2 minutos para verificar inactividad
   * Frecuencia optimizada para detección rápida sin saturar el sistema
   */
  @Cron('0 */2 * * * *', {
    name: 'visitor-inactivity-check',
    timeZone: 'UTC',
  })
  async handleInactivityCheck(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    // Evitar ejecuciones concurrentes
    if (this.isProcessing) {
      this.logger.debug(
        '[CRON] Verificación de inactividad ya en progreso, omitiendo ejecución',
      );
      return;
    }

    try {
      this.isProcessing = true;
      const startTime = Date.now();

      this.logger.log(
        '[CRON] 🔍 Iniciando verificación de inactividad de visitantes',
      );

      // Obtener todos los visitantes online
      const onlineVisitors = await this.connectionService.getOnlineVisitors();

      if (onlineVisitors.length === 0) {
        this.logger.debug('[CRON] No hay visitantes online para verificar');
        return;
      }

      this.logger.log(
        `[CRON] Verificando inactividad de ${onlineVisitors.length} visitantes`,
      );

      let movedToAway = 0;
      let movedToOffline = 0;
      const now = Date.now();

      for (const visitorId of onlineVisitors) {
        try {
          const lastActivity =
            await this.connectionService.getLastActivity(visitorId);

          if (!lastActivity) {
            this.logger.warn(
              `[CRON] No se encontró lastActivity para visitante: ${visitorId.value}`,
            );
            continue;
          }

          const inactiveTime = now - lastActivity.value.getTime();

          // Verificar si debe marcarse como OFFLINE (>15 min sin actividad)
          if (inactiveTime >= this.OFFLINE_THRESHOLD_MS) {
            this.logger.log(
              `[CRON] 🔴 Visitante ${visitorId.value} inactivo por ${Math.floor(inactiveTime / 60000)} min → marcando como OFFLINE`,
            );

            await this.commandBus.execute(
              new GoOfflineVisitorCommand(visitorId.value),
            );

            movedToOffline++;
          }
          // Verificar si debe marcarse como AWAY (5-15 min sin actividad)
          else if (inactiveTime >= this.AWAY_THRESHOLD_MS) {
            const currentStatus =
              await this.connectionService.getConnectionStatus(visitorId);

            // Solo cambiar a AWAY si actualmente está ONLINE o CHATTING
            if (
              currentStatus &&
              (currentStatus.value === ConnectionStatus.ONLINE ||
                currentStatus.value === ConnectionStatus.CHATTING)
            ) {
              this.logger.log(
                `[CRON] 🟡 Visitante ${visitorId.value} inactivo por ${Math.floor(inactiveTime / 60000)} min → marcando como AWAY`,
              );

              await this.commandBus.execute(
                new ChangeVisitorConnectionStatusCommand(
                  visitorId.value,
                  'away',
                ),
              );

              movedToAway++;
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Error desconocido';
          this.logger.error(
            `[CRON] Error al procesar visitante ${visitorId.value}: ${errorMessage}`,
          );
          // Continuar con el siguiente visitante
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[CRON] ✅ Verificación completada en ${duration}ms. Away: ${movedToAway}, Offline: ${movedToOffline}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[CRON] 🚨 Error crítico en verificación de inactividad: ${errorMessage}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Método manual para testing
   */
  async triggerManualCheck(): Promise<void> {
    this.logger.log('[MANUAL] Ejecutando verificación manual de inactividad');
    await this.handleInactivityCheck();
  }
}
