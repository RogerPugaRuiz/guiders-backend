import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../../domain/consent.repository';

/**
 * Servicio para detectar consentimientos próximos a expirar
 *
 * Ejecuta un cron job semanal que:
 * 1. Encuentra consentimientos próximos a expirar (30 días antes)
 * 2. Envía notificaciones a los visitantes para renovar su consentimiento
 * 3. Registra en logs para auditoría
 *
 * GDPR Art. 7.1: Proactividad en la gestión del consentimiento
 */
@Injectable()
export class CheckExpiringConsentsService {
  private readonly logger = new Logger(CheckExpiringConsentsService.name);
  private readonly DAYS_BEFORE_EXPIRATION = 30; // Días de anticipación

  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repository: ConsentRepository,
  ) {}

  /**
   * Cron job que se ejecuta todos los lunes a las 09:00 AM
   * para detectar consentimientos próximos a expirar
   */
  @Cron(CronExpression.EVERY_WEEK, {
    name: 'check-expiring-consents',
    timeZone: 'UTC',
  })
  async handleExpiringConsents(): Promise<void> {
    this.logger.log(
      '[CRON] Iniciando job de detección de consentimientos próximos a expirar...',
    );

    try {
      // 1. Buscar consentimientos próximos a expirar
      const result = await this.repository.findExpiringConsents(
        this.DAYS_BEFORE_EXPIRATION,
      );

      if (result.isErr()) {
        this.logger.error(
          `Error al buscar consentimientos próximos a expirar: ${result.error.message}`,
        );
        return;
      }

      const expiringConsents = result.value;

      if (expiringConsents.length === 0) {
        this.logger.log(
          '[CRON] No hay consentimientos próximos a expirar para procesar',
        );
        return;
      }

      this.logger.log(
        `[CRON] Encontrados ${expiringConsents.length} consentimientos próximos a expirar`,
      );

      // 2. Procesar cada consentimiento próximo a expirar
      let notificationsSent = 0;
      let notificationsFailed = 0;

      for (const consent of expiringConsents) {
        try {
          // TODO: Enviar notificación al visitante
          // Por ahora solo registramos en logs
          this.logger.log(
            `[CRON] Consentimiento ${consent.id.value} expira el ${consent.expiresAt?.toISOString()} ` +
              `(visitante: ${consent.visitorId.getValue()}, tipo: ${consent.consentType.value})`,
          );

          notificationsSent++;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Error desconocido';
          this.logger.error(
            `Error al notificar consentimiento ${consent.id.value}: ${message}`,
          );
          notificationsFailed++;
        }
      }

      // 3. Reporte final
      this.logger.log(
        `[CRON] Job completado: ${notificationsSent} notificaciones enviadas, ${notificationsFailed} errores`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error crítico en job de detección de consentimientos próximos a expirar: ${message}`,
      );
    }
  }

  /**
   * Método manual para forzar la verificación de consentimientos próximos a expirar
   * Útil para testing o mantenimiento
   */
  async checkExpiringConsentsManually(): Promise<{
    found: number;
    notified: number;
  }> {
    this.logger.log(
      '[MANUAL] Ejecutando verificación manual de consentimientos próximos a expirar...',
    );

    const result = await this.repository.findExpiringConsents(
      this.DAYS_BEFORE_EXPIRATION,
    );

    if (result.isErr()) {
      this.logger.error(`Error: ${result.error.message}`);
      return { found: 0, notified: 0 };
    }

    const found = result.value.length;
    this.logger.log(
      `[MANUAL] Encontrados ${found} consentimientos próximos a expirar`,
    );

    return { found, notified: 0 }; // TODO: Actualizar cuando se implemente NotificationService
  }
}
