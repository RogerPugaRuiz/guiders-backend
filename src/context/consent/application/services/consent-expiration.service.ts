import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventPublisher } from '@nestjs/cqrs';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../../domain/consent.repository';

/**
 * Servicio para gestionar la expiración automática de consentimientos
 *
 * Ejecuta un cron job diario que:
 * 1. Encuentra todos los consentimientos expirados (con fecha pasada)
 * 2. Marca cada uno como 'expired'
 * 3. Emite eventos de dominio para auditoría
 *
 * GDPR: Asegura que consentimientos vencidos no se usen para procesar datos
 */
@Injectable()
export class ConsentExpirationService {
  private readonly logger = new Logger(ConsentExpirationService.name);

  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repository: ConsentRepository,
    private readonly publisher: EventPublisher,
  ) {}

  /**
   * Cron job que se ejecuta todos los días a las 02:00 AM
   * para procesar consentimientos expirados
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'expire-consents',
    timeZone: 'UTC',
  })
  async handleConsentExpiration(): Promise<void> {
    this.logger.log('[CRON] Iniciando job de expiración de consentimientos...');

    try {
      // 1. Buscar consentimientos expirados
      const result = await this.repository.findExpiredConsents();

      if (result.isErr()) {
        this.logger.error(
          `Error al buscar consentimientos expirados: ${result.error.message}`,
        );
        return;
      }

      const expiredConsents = result.value;

      if (expiredConsents.length === 0) {
        this.logger.log(
          '[CRON] No hay consentimientos expirados para procesar',
        );
        return;
      }

      this.logger.log(
        `[CRON] Encontrados ${expiredConsents.length} consentimientos expirados`,
      );

      // 2. Marcar cada uno como expirado
      let successCount = 0;
      let errorCount = 0;

      for (const consent of expiredConsents) {
        try {
          // Marcar como expirado (emite evento)
          const expiredConsent = consent.expire();

          // Merge con el event publisher
          const consentCtx = this.publisher.mergeObjectContext(expiredConsent);

          // Guardar estado actualizado
          const saveResult = await this.repository.save(consentCtx);

          if (saveResult.isErr()) {
            this.logger.error(
              `Error al guardar consentimiento expirado ${consent.id.value}: ${saveResult.error.message}`,
            );
            errorCount++;
            continue;
          }

          // CRÍTICO: Commit para despachar eventos
          consentCtx.commit();

          successCount++;

          this.logger.debug(
            `[CRON] Consentimiento ${consent.id.value} marcado como expirado`,
          );
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Error desconocido';
          this.logger.error(
            `Error al procesar consentimiento ${consent.id.value}: ${message}`,
          );
          errorCount++;
        }
      }

      // 3. Reporte final
      this.logger.log(
        `[CRON] Job completado: ${successCount} expirados correctamente, ${errorCount} errores`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error crítico en job de expiración: ${message}`);
    }
  }

  /**
   * Método manual para forzar la expiración de consentimientos
   * Útil para testing o mantenimiento
   */
  async expireConsentsManually(): Promise<{
    success: number;
    errors: number;
  }> {
    this.logger.log(
      '[MANUAL] Ejecutando expiración manual de consentimientos...',
    );
    await this.handleConsentExpiration();
    return { success: 0, errors: 0 }; // Se actualiza en handleConsentExpiration
  }
}
