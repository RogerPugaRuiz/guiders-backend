import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConsentRevokedEvent } from '../../domain/events/consent-revoked.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { ConsentAuditLog } from '../../domain/consent-audit-log.aggregate';
import { AuditActionType } from '../../domain/value-objects/audit-action-type';

/**
 * Event Handler para registrar en audit log cuando se revoca un consentimiento
 *
 * GDPR Art. 7.3: El interesado tiene derecho a retirar su consentimiento
 * GDPR Art. 30: Registro de las actividades de tratamiento
 *
 * Patrón de nomenclatura: Log<Action>On<Event>EventHandler
 */
@EventsHandler(ConsentRevokedEvent)
export class LogConsentRevokedEventHandler
  implements IEventHandler<ConsentRevokedEvent>
{
  private readonly logger = new Logger(LogConsentRevokedEventHandler.name);

  constructor(
    @Inject(CONSENT_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: ConsentAuditLogRepository,
  ) {}

  async handle(event: ConsentRevokedEvent): Promise<void> {
    this.logger.debug(
      `[AUDIT] Registrando consentimiento revocado: ${event.payload.consentId}`,
    );

    try {
      // Crear registro de auditoría
      const auditLog = ConsentAuditLog.create({
        consentId: event.payload.consentId,
        visitorId: event.payload.visitorId,
        actionType: AuditActionType.revoked(),
        consentType: event.payload.consentType,
        reason: event.payload.reason,
        metadata: {
          revokedAt: event.payload.revokedAt,
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
        `[AUDIT] Consentimiento revocado registrado: ${event.payload.consentId} para visitante ${event.payload.visitorId}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[AUDIT] Error crítico al procesar evento ConsentRevokedEvent: ${message}`,
      );
    }
  }
}
