import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ConsentDeniedEvent } from '../../domain/events/consent-denied.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { ConsentAuditLog } from '../../domain/consent-audit-log.aggregate';
import { AuditActionType } from '../../domain/value-objects/audit-action-type';

/**
 * Event Handler para registrar audit logs cuando se rechaza un consentimiento
 * RGPD Art. 5.2: Responsabilidad proactiva
 * RGPD Art. 30: Registro de las actividades de tratamiento
 */
@EventsHandler(ConsentDeniedEvent)
export class LogConsentDeniedEventHandler
  implements IEventHandler<ConsentDeniedEvent>
{
  private readonly logger = new Logger(LogConsentDeniedEventHandler.name);

  constructor(
    @Inject(CONSENT_AUDIT_LOG_REPOSITORY)
    private readonly repository: ConsentAuditLogRepository,
  ) {}

  async handle(event: ConsentDeniedEvent): Promise<void> {
    this.logger.log(
      `📝 Registrando audit log para rechazo de consentimiento: ${event.payload.consentId}`,
    );

    try {
      const auditLog = ConsentAuditLog.create({
        consentId: event.payload.consentId,
        visitorId: event.payload.visitorId,
        actionType: AuditActionType.denied(),
        consentType: event.payload.consentType,
        consentVersion: event.payload.version,
        ipAddress: event.payload.ipAddress,
        userAgent: event.payload.userAgent,
        metadata: event.payload.metadata || {
          deniedAt: event.payload.deniedAt,
        },
      });

      const result = await this.repository.save(auditLog);

      if (result.isErr()) {
        this.logger.error(
          `❌ Error al guardar audit log: ${result.error.message}`,
        );
        return;
      }

      this.logger.log(
        `✅ Audit log registrado exitosamente para rechazo: ${event.payload.consentId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error al procesar evento ConsentDeniedEvent:`,
        error,
      );
    }
  }
}
