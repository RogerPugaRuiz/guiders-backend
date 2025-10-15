import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { DenyConsentCommand } from './deny-consent.command';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../../domain/consent.repository';
import { VisitorConsent } from '../../domain/visitor-consent.aggregate';
import { ConsentType } from '../../domain/value-objects/consent-type';
import { ConsentVersion } from '../../domain/value-objects/consent-version';
import { Result, ok, err } from '../../../shared/domain/result';
import { ConsentError } from '../../domain/errors/consent.error';

/**
 * Handler para registrar un rechazo de consentimiento
 * Cumplimiento RGPD Art. 5.2: Responsabilidad proactiva
 */
@CommandHandler(DenyConsentCommand)
export class DenyConsentCommandHandler
  implements ICommandHandler<DenyConsentCommand>
{
  private readonly logger = new Logger(DenyConsentCommandHandler.name);

  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repository: ConsentRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: DenyConsentCommand,
  ): Promise<Result<string, ConsentError>> {
    try {
      this.logger.log(
        `🔴 [INICIO] DenyConsentCommand - visitorId: ${command.visitorId}, tipo: ${command.consentType}`,
      );

      // Validar el tipo de consentimiento
      this.logger.debug('📝 Validando tipo de consentimiento...');
      const consentType = new ConsentType(command.consentType);
      const version = ConsentVersion.current(); // Usar versión actual por defecto

      this.logger.debug(
        `✅ Tipo validado: ${consentType.value}, Versión: ${version.value}`,
      );

      // Crear el agregado de consentimiento con status "denied" (emite evento)
      this.logger.debug('🏗️  Creando agregado de consentimiento (denied)...');
      const consent = VisitorConsent.deny({
        visitorId: command.visitorId,
        consentType,
        version,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
        metadata: command.metadata,
      });

      this.logger.debug(
        `✅ Agregado creado con ID: ${consent.id.value}, status: denied`,
      );

      // Merge con el event publisher para capturar eventos
      this.logger.debug('🔗 Merging con EventPublisher...');
      const consentCtx = this.publisher.mergeObjectContext(consent);

      // Guardar en el repositorio
      this.logger.log(
        `💾 Guardando consentimiento rechazado en MongoDB: ${consent.id.value}`,
      );
      const saveResult = await this.repository.save(consentCtx);

      if (saveResult.isErr()) {
        this.logger.error(
          `❌ Error al guardar en repositorio: ${saveResult.error.message}`,
        );
        return err(new ConsentError(saveResult.error.message));
      }

      this.logger.log(
        '✅ Consentimiento rechazado guardado exitosamente en MongoDB',
      );

      // CRÍTICO: Commit para despachar los eventos
      this.logger.debug('📢 Ejecutando commit() para despachar eventos...');
      if (consentCtx && typeof consentCtx.commit === 'function') {
        consentCtx.commit();
        this.logger.log('✅ Eventos despachados correctamente');
      } else {
        this.logger.warn(
          '⚠️  EventPublisher no disponible, eventos no serán despachados',
        );
      }
      this.logger.log(
        `✅ [FIN] Consentimiento rechazado registrado completamente: ${consent.id.value}`,
      );

      return ok(consent.id.value);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `❌ [ERROR] DenyConsentCommand falló: ${message}`,
        error instanceof Error ? error.stack : '',
      );
      const consentError = new ConsentError(
        `Error al registrar rechazo de consentimiento: ${message}`,
      );
      return err(consentError);
    }
  }
}
