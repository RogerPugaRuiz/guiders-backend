import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConsentExpiredEvent } from '../../domain/events/consent-expired.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { ConsentAuditLog } from '../../domain/consent-audit-log.aggregate';
import { AuditActionType } from '../../domain/value-objects/audit-action-type';

/**
 * Event Handler para registrar en audit log cuando expira un consentimiento
 *
 * GDPR Art. 5.2: Responsabilidad proactiva - demostrar cumplimiento
 * GDPR Art. 30: Registro de las actividades de tratamiento
 *
 * Patrón de nomenclatura: Log<Action>On<Event>EventHandler
 */
@EventsHandler(ConsentExpiredEvent)
export class LogConsentExpiredEventHandler
  implements IEventHandler<ConsentExpiredEvent>
{
  private readonly logger = new Logger(LogConsentExpiredEventHandler.name);

  constructor(
    @Inject(CONSENT_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: ConsentAuditLogRepository,
  ) {}

  async handle(event: ConsentExpiredEvent): Promise<void> {
    this.logger.debug(
      `[AUDIT] Registrando consentimiento expirado: ${event.payload.consentId}`,
    );

    try {
      // Crear registro de auditoría
      const auditLog = ConsentAuditLog.create({
        consentId: event.payload.consentId,
        visitorId: event.payload.visitorId,
        actionType: AuditActionType.expired(),
        consentType: event.payload.consentType,
        metadata: {
          expiredAt: event.payload.expiredAt,
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
        `[AUDIT] Consentimiento expirado registrado: ${event.payload.consentId} para visitante ${event.payload.visitorId}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[AUDIT] Error crítico al procesar evento ConsentExpiredEvent: ${message}`,
      );
    }
  }
}
