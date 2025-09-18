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
   * Ejecuta limpieza cada 15 minutos
   */
  @Cron('0 */15 * * * *')
  async handleSessionCleanup(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Session cleanup deshabilitado via ENV');
      return;
    }

    try {
      this.logger.log('Iniciando limpieza automática de sesiones expiradas');

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
        this.logger.log(
          `Limpieza automática completada. Visitantes procesados: ${cleanedCount as number}`,
        );
      } else {
        this.logger.error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Error en limpieza automática: ${result.error.message as string}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error inesperado durante limpieza automática de sesiones',
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
