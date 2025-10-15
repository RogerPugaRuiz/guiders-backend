import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConsentRenewedEvent } from '../../domain/events/consent-renewed.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { ConsentAuditLog } from '../../domain/consent-audit-log.aggregate';
import { AuditActionType } from '../../domain/value-objects/audit-action-type';

/**
 * Event Handler para registrar en audit log cuando se renueva un consentimiento
 *
 * GDPR Art. 7.1: Mantener registro actualizado del consentimiento
 * GDPR Art. 30: Registro de las actividades de tratamiento
 *
 * Patrón de nomenclatura: Log<Action>On<Event>EventHandler
 */
@EventsHandler(ConsentRenewedEvent)
export class LogConsentRenewedEventHandler
  implements IEventHandler<ConsentRenewedEvent>
{
  private readonly logger = new Logger(LogConsentRenewedEventHandler.name);

  constructor(
    @Inject(CONSENT_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: ConsentAuditLogRepository,
  ) {}

  async handle(event: ConsentRenewedEvent): Promise<void> {
    this.logger.debug(
      `[AUDIT] Registrando consentimiento renovado: ${event.payload.consentId}`,
    );

    try {
      // Crear registro de auditoría
      const auditLog = ConsentAuditLog.create({
        consentId: event.payload.consentId,
        visitorId: event.payload.visitorId,
        actionType: AuditActionType.renewed(),
        consentType: event.payload.consentType,
        consentVersion: undefined, // La versión no cambia en una renovación
        ipAddress: undefined, // No se captura IP en renovaciones automáticas
        userAgent: undefined,
        metadata: {
          renewedAt: event.payload.renewedAt,
          newExpiresAt: event.payload.newExpiresAt,
          previousExpiresAt: event.payload.previousExpiresAt,
        },
      });

      // Guardar en repositorio
      const result = await this.auditLogRepository.save(auditLog);

      if (result.isErr()) {
        this.logger.error(
          `[AUDIT] Error al guardar audit log para consentimiento ${event.payload.consentId}: ${result.error.message}`,
        );
        return;
      }

      this.logger.log(
        `[AUDIT] Consentimiento renovado registrado: ${event.payload.consentId} para visitante ${event.payload.visitorId}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[AUDIT] Error crítico al procesar evento ConsentRenewedEvent: ${message}`,
      );
    }
  }
}
