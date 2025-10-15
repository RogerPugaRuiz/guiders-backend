import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConsentGrantedEvent } from '../../domain/events/consent-granted.event';
import {
  ConsentAuditLogRepository,
  CONSENT_AUDIT_LOG_REPOSITORY,
} from '../../domain/consent-audit-log.repository';
import { ConsentAuditLog } from '../../domain/consent-audit-log.aggregate';
import { AuditActionType } from '../../domain/value-objects/audit-action-type';

/**
 * Event Handler para registrar en audit log cuando se otorga un consentimiento
 *
 * GDPR Art. 7.1: El responsable debe poder demostrar que el interesado consintió
 * GDPR Art. 30: Registro de las actividades de tratamiento
 *
 * Patrón de nomenclatura: Log<Action>On<Event>EventHandler
 */
@EventsHandler(ConsentGrantedEvent)
export class LogConsentGrantedEventHandler
  implements IEventHandler<ConsentGrantedEvent>
{
  private readonly logger = new Logger(LogConsentGrantedEventHandler.name);

  constructor(
    @Inject(CONSENT_AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: ConsentAuditLogRepository,
  ) {}

  async handle(event: ConsentGrantedEvent): Promise<void> {
    this.logger.debug(
      `[AUDIT] Registrando consentimiento otorgado: ${event.payload.consentId}`,
    );

    try {
      // Crear registro de auditoría
      const auditLog = ConsentAuditLog.create({
        consentId: event.payload.consentId,
        visitorId: event.payload.visitorId,
        actionType: AuditActionType.granted(),
        consentType: event.payload.consentType,
        consentVersion: event.payload.version,
        ipAddress: event.payload.ipAddress,
        userAgent: event.payload.userAgent,
        metadata: {
          grantedAt: event.payload.grantedAt,
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
        `[AUDIT] Consentimiento otorgado registrado: ${event.payload.consentId} para visitante ${event.payload.visitorId}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `[AUDIT] Error crítico al procesar evento ConsentGrantedEvent: ${message}`,
      );
    }
  }
}
