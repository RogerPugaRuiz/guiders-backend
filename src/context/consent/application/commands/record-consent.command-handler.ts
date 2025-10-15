import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { RecordConsentCommand } from './record-consent.command';
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
 * Handler para registrar un consentimiento
 * Cumplimiento RGPD Art. 7.1: Capacidad de demostrar el consentimiento
 */
@CommandHandler(RecordConsentCommand)
export class RecordConsentCommandHandler
  implements ICommandHandler<RecordConsentCommand>
{
  private readonly logger = new Logger(RecordConsentCommandHandler.name);

  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repository: ConsentRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: RecordConsentCommand,
  ): Promise<Result<string, ConsentError>> {
    try {
      this.logger.log(
        `🔵 [INICIO] RecordConsentCommand - visitorId: ${command.visitorId}, tipo: ${command.consentType}, versión: ${command.version}`,
      );

      // Validar el tipo de consentimiento
      this.logger.debug('📝 Validando tipo de consentimiento...');
      const consentType = new ConsentType(command.consentType);
      const version = ConsentVersion.fromString(command.version);
      this.logger.debug(
        `✅ Tipo validado: ${consentType.value}, Versión: ${version.value}`,
      );

      // Crear el agregado de consentimiento (emite evento)
      this.logger.debug('🏗️  Creando agregado de consentimiento...');
      const consent = VisitorConsent.grant({
        visitorId: command.visitorId,
        consentType,
        version,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
        metadata: command.metadata,
      });
      this.logger.debug(`✅ Agregado creado con ID: ${consent.id.value}`);

      // Merge con el event publisher para capturar eventos
      this.logger.debug('🔗 Merging con EventPublisher...');
      const consentCtx = this.publisher.mergeObjectContext(consent);

      // Guardar en el repositorio
      this.logger.log(
        `💾 Guardando consentimiento en MongoDB: ${consent.id.value}`,
      );
      const saveResult = await this.repository.save(consentCtx);

      if (saveResult.isErr()) {
        this.logger.error(
          `❌ Error al guardar en repositorio: ${saveResult.error.message}`,
        );
        return err(new ConsentError(saveResult.error.message));
      }

      this.logger.log('✅ Consentimiento guardado exitosamente en MongoDB');

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
        `✅ [FIN] Consentimiento registrado completamente: ${consent.id.value}`,
      );

      return ok(consent.id.value);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `❌ [ERROR] RecordConsentCommand falló: ${message}`,
        error instanceof Error ? error.stack : '',
      );
      const consentError = new ConsentError(
        `Error al registrar consentimiento: ${message}`,
      );
      return err(consentError);
    }
  }
}
