import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TrackingEventBufferService } from '../../application/services';

/**
 * Scheduler para hacer flush periódico del buffer de eventos
 *
 * Este scheduler es un backup del flush automático que ya tiene el BufferService.
 * Se ejecuta cada 10 segundos para asegurar que no se pierdan eventos en caso
 * de fallos del timer interno del BufferService.
 */
@Injectable()
export class BufferFlushScheduler {
  private readonly logger = new Logger(BufferFlushScheduler.name);
  private readonly isEnabled: boolean;
  private isProcessing = false;

  constructor(private readonly bufferService: TrackingEventBufferService) {
    this.isEnabled = process.env.BUFFER_FLUSH_SCHEDULER_ENABLED !== 'false';
  }

  /**
   * Cron job que se ejecuta cada 10 segundos
   * Hace flush del buffer si tiene eventos pendientes
   */
  @Cron('*/10 * * * * *', {
    name: 'buffer-flush',
    timeZone: 'UTC',
  })
  async handleBufferFlush(): Promise<void> {
    // Verificar si está habilitado
    if (!this.isEnabled) {
      return;
    }

    // Evitar ejecuciones concurrentes
    if (this.isProcessing) {
      this.logger.debug('[CRON] Flush ya en progreso, omitiendo ejecución');
      return;
    }

    try {
      this.isProcessing = true;

      const bufferSize = this.bufferService.size();

      if (bufferSize === 0) {
        this.logger.debug('[CRON] Buffer vacío, omitiendo flush');
        return;
      }

      this.logger.log(
        `[CRON] Iniciando flush periódico del buffer (${bufferSize} eventos pendientes)`,
      );

      const result = await this.bufferService.flush();

      if (result.isErr()) {
        this.logger.error(
          `[CRON] Error en flush periódico: ${result.error.message}`,
        );
        return;
      }

      const stats = this.bufferService.getStats();
      this.logger.log(
        `[CRON] Flush periódico completado. Stats: ` +
          `received=${stats.totalReceived}, ` +
          `flushed=${stats.totalFlushed}, ` +
          `discarded=${stats.totalDiscarded}, ` +
          `flushCount=${stats.flushCount}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`[CRON] Error crítico en flush periódico: ${message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Método manual para obtener estadísticas del buffer
   * Útil para monitoreo y debugging
   */
  getBufferStats() {
    return this.bufferService.getStats();
  }

  /**
   * Método manual para forzar un flush
   * Útil para testing o situaciones de emergencia
   */
  async forceFlush(): Promise<void> {
    this.logger.log('[MANUAL] Forzando flush del buffer...');

    const result = await this.bufferService.flush();

    if (result.isErr()) {
      this.logger.error(
        `[MANUAL] Error al forzar flush: ${result.error.message}`,
      );
      throw new Error(result.error.message);
    }

    const stats = this.bufferService.getStats();
    this.logger.log(
      `[MANUAL] Flush forzado completado. Eventos flusheados: ${stats.totalFlushed}`,
    );
  }
}
