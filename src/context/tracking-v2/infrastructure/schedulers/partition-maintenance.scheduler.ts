import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PartitionRouterService } from '../persistence/services/partition-router.service';

/**
 * Scheduler para mantenimiento de particiones
 *
 * Ejecuta tareas periódicas de:
 * - Verificación de salud de particiones
 * - Limpieza de particiones antiguas (opcional, configurable)
 * - Monitoreo de tamaños de collections
 */
@Injectable()
export class PartitionMaintenanceScheduler {
  private readonly logger = new Logger(PartitionMaintenanceScheduler.name);
  private isProcessing = false;

  // Configuración de retención de datos (en días)
  private readonly RETENTION_DAYS = parseInt(
    process.env.TRACKING_RETENTION_DAYS || '365',
    10,
  );

  // Habilitar limpieza automática de particiones antiguas
  private readonly AUTO_CLEANUP_ENABLED =
    process.env.TRACKING_AUTO_CLEANUP_ENABLED === 'true';

  constructor(private readonly partitionRouter: PartitionRouterService) {}

  /**
   * Cron job que se ejecuta diariamente a las 03:00 AM UTC
   * Verifica el estado de las particiones y hace limpieza si está habilitada
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'partition-maintenance',
    timeZone: 'UTC',
  })
  async handlePartitionMaintenance(): Promise<void> {
    // Evitar ejecuciones concurrentes
    if (this.isProcessing) {
      this.logger.debug(
        '[CRON] Mantenimiento ya en progreso, omitiendo ejecución',
      );
      return;
    }

    try {
      this.isProcessing = true;

      this.logger.log('[CRON] Iniciando mantenimiento de particiones...');

      // 1. Obtener estadísticas de particiones
      const stats = await this.partitionRouter.getPartitionStats();

      this.logger.log(
        `[CRON] Estadísticas de particiones: ${stats.totalCollections} collections`,
      );

      // Log de cada partición con su tamaño
      stats.collections.forEach((collection) => {
        this.logger.log(
          `  - ${collection.name}: ${collection.documentCount} documentos (${collection.date})`,
        );
      });

      // 2. Limpieza automática si está habilitada
      if (this.AUTO_CLEANUP_ENABLED) {
        await this.performAutoCleanup();
      } else {
        this.logger.log(
          '[CRON] Limpieza automática deshabilitada (TRACKING_AUTO_CLEANUP_ENABLED=false)',
        );
      }

      // 3. Verificar si hay collections vacías o con muy pocos documentos
      const emptyCollections = stats.collections.filter(
        (c) => c.documentCount === 0,
      );

      if (emptyCollections.length > 0) {
        this.logger.warn(
          `[CRON] Encontradas ${emptyCollections.length} collections vacías: ${emptyCollections.map((c) => c.name).join(', ')}`,
        );
      }

      this.logger.log('[CRON] Mantenimiento de particiones completado');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[CRON] Error crítico en mantenimiento de particiones: ${message}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Realiza limpieza automática de particiones antiguas
   */
  private async performAutoCleanup(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);

    this.logger.log(
      `[CRON] Limpiando particiones anteriores a ${retentionDate.toISOString()} ` +
        `(retención: ${this.RETENTION_DAYS} días)`,
    );

    try {
      const droppedCollections =
        await this.partitionRouter.dropCollectionsOlderThan(retentionDate);

      if (droppedCollections.length > 0) {
        this.logger.warn(
          `[CRON] ⚠️  Eliminadas ${droppedCollections.length} particiones antiguas: ${droppedCollections.join(', ')}`,
        );
      } else {
        this.logger.log('[CRON] No hay particiones antiguas para eliminar');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`[CRON] Error al limpiar particiones: ${message}`);
    }
  }

  /**
   * Método manual para obtener estadísticas de particiones
   * Útil para monitoreo y debugging
   */
  async getPartitionStats() {
    return await this.partitionRouter.getPartitionStats();
  }

  /**
   * Método manual para forzar limpieza de particiones antiguas
   * CUIDADO: Esta operación es irreversible
   */
  async forceCleanupOlderThan(days: number): Promise<string[]> {
    this.logger.warn(
      `[MANUAL] ⚠️  Forzando limpieza de particiones antiguas (>${days} días)...`,
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const droppedCollections =
      await this.partitionRouter.dropCollectionsOlderThan(cutoffDate);

    this.logger.warn(
      `[MANUAL] Eliminadas ${droppedCollections.length} particiones: ${droppedCollections.join(', ')}`,
    );

    return droppedCollections;
  }

  /**
   * Método manual para ejecutar mantenimiento inmediatamente
   * Útil para testing o situaciones de emergencia
   */
  async runMaintenanceNow(): Promise<void> {
    this.logger.log('[MANUAL] Ejecutando mantenimiento manual...');
    await this.handlePartitionMaintenance();
  }
}
