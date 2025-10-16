import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { CleanExpiredSessionsCommand } from '../commands/clean-expired-sessions.command';

/**
 * Servicio scheduler que ejecuta automáticamente la limpieza de sesiones expiradas
 */
@Injectable()
export class SessionCleanupScheduler {
  private readonly logger = new Logger(SessionCleanupScheduler.name);
  private readonly batchSize: number;
  private readonly isEnabled: boolean;

  constructor(private readonly commandBus: CommandBus) {
    this.batchSize = parseInt(
      process.env.SESSION_CLEANUP_BATCH_SIZE || '100',
      10,
    );
    this.isEnabled = process.env.SESSION_CLEANUP_ENABLED !== 'false';

    this.logger.log(
      `Session Cleanup Scheduler inicializado. Habilitado: ${this.isEnabled}, Lote: ${this.batchSize}`,
    );
  }

  /**
   * Ejecuta limpieza cada 5 minutos
   * Frecuencia optimizada para detección más rápida de sesiones expiradas:
   * - ANON: timeout 5 min → sesión cerrada en máximo 10 min (5 min timeout + 5 min scheduler)
   * - ENGAGED: timeout 15 min → sesión cerrada en máximo 20 min
   * - LEAD: timeout 30 min → sesión cerrada en máximo 35 min
   * - CONVERTED: timeout 60 min → sesión cerrada en máximo 65 min
   */
  @Cron('0 */5 * * * *')
  async handleSessionCleanup(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Session cleanup deshabilitado via ENV');
      return;
    }

    try {
      const startTime = Date.now();
      this.logger.log(
        `🧹 Iniciando limpieza automática de sesiones expiradas (lote: ${this.batchSize})`,
      );

      const command = new CleanExpiredSessionsCommand(
        undefined,
        this.batchSize,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.commandBus.execute(command);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (result.isOk()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const { cleanedCount } = result.value;
        const duration = Date.now() - startTime;
        this.logger.log(
          `✅ Limpieza automática completada en ${duration}ms. Visitantes con sesiones cerradas: ${cleanedCount as number}`,
        );
      } else {
        this.logger.error(
          `❌ Error en limpieza automática: ${result.error.message as string}`,
        );
      }
    } catch (error) {
      this.logger.error(
        '🚨 Error inesperado durante limpieza automática de sesiones',
        error,
      );
    }
  }

  /**
   * Método manual para testing
   */
  async triggerManualCleanup(batchSize?: number): Promise<void> {
    this.logger.log('Ejecutando limpieza manual de sesiones');

    const command = new CleanExpiredSessionsCommand(
      undefined,
      batchSize || this.batchSize,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.commandBus.execute(command);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (result.isOk()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { cleanedCount } = result.value;
      this.logger.log(
        `Limpieza manual completada. Visitantes procesados: ${cleanedCount as number}`,
      );
    } else {
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error en limpieza manual: ${result.error.message as string}`,
      );
    }
  }
}
