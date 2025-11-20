import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import {
  CommercialConnectionDomainService,
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
} from '../../domain/commercial-connection.domain-service';
import { CommandBus } from '@nestjs/cqrs';
import { ChangeCommercialConnectionStatusCommand } from '../../application/commands/change-commercial-connection-status.command';

/**
 * Scheduler que detecta automáticamente inactividad de comerciales
 * y actualiza su estado a "away" u "offline" según el tiempo sin actividad
 *
 * Tiempos de inactividad:
 * - 0-5 minutos: ONLINE (activo)
 * - 5-10 minutos: AWAY (inactivo pero conectado)
 * - >10 minutos: OFFLINE (desconectado, TTL expira en Redis)
 *
 * Frecuencia de ejecución: Cada 2 minutos
 */
@Injectable()
export class CommercialInactivityScheduler {
  private readonly logger = new Logger(CommercialInactivityScheduler.name);
  private readonly isEnabled: boolean;
  private readonly AWAY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos
  private readonly OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutos
  private isProcessing = false;

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    private readonly commandBus: CommandBus,
  ) {
    this.isEnabled = process.env.PRESENCE_INACTIVITY_ENABLED !== 'false';
    this.logger.log(
      `Commercial Inactivity Scheduler inicializado. Habilitado: ${this.isEnabled}`,
    );
  }

  /**
   * Se ejecuta cada 2 minutos para verificar inactividad
   * Frecuencia optimizada para detección rápida sin saturar el sistema
   */
  @Cron('0 */2 * * * *', {
    name: 'commercial-inactivity-check',
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
        '[CRON] 🔍 Iniciando verificación de inactividad de comerciales',
      );

      // Obtener todos los comerciales online
      const onlineCommercials =
        await this.connectionService.getOnlineCommercials();

      if (onlineCommercials.length === 0) {
        this.logger.debug('[CRON] No hay comerciales online para verificar');
        return;
      }

      this.logger.log(
        `[CRON] Verificando inactividad de ${onlineCommercials.length} comerciales`,
      );

      let movedToAway = 0;
      let movedToOffline = 0;
      const now = Date.now();

      for (const commercialId of onlineCommercials) {
        try {
          const lastActivity =
            await this.connectionService.getLastActivity(commercialId);

          if (!lastActivity) {
            this.logger.warn(
              `[CRON] No se encontró lastActivity para comercial: ${commercialId.value}`,
            );
            continue;
          }

          const inactiveTime = now - lastActivity.value.getTime();

          // Verificar si debe marcarse como OFFLINE (>10 min sin actividad)
          if (inactiveTime >= this.OFFLINE_THRESHOLD_MS) {
            this.logger.log(
              `[CRON] 🔴 Comercial ${commercialId.value} inactivo por ${Math.floor(inactiveTime / 60000)} min → marcando como OFFLINE`,
            );

            await this.commandBus.execute(
              new ChangeCommercialConnectionStatusCommand(
                commercialId.value,
                'offline',
              ),
            );

            movedToOffline++;
          }
          // Verificar si debe marcarse como AWAY (5-10 min sin actividad)
          else if (inactiveTime >= this.AWAY_THRESHOLD_MS) {
            const currentStatus =
              await this.connectionService.getConnectionStatus(commercialId);

            // Solo cambiar a AWAY si actualmente está ONLINE
            if (currentStatus && currentStatus.value === 'online') {
              this.logger.log(
                `[CRON] 🟡 Comercial ${commercialId.value} inactivo por ${Math.floor(inactiveTime / 60000)} min → marcando como AWAY`,
              );

              await this.commandBus.execute(
                new ChangeCommercialConnectionStatusCommand(
                  commercialId.value,
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
            `[CRON] Error al procesar comercial ${commercialId.value}: ${errorMessage}`,
          );
          // Continuar con el siguiente comercial
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
