import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { RevokeConsentCommand } from './revoke-consent.command';
import {
  ConsentRepository,
  CONSENT_REPOSITORY,
} from '../../domain/consent.repository';
import { ConsentType } from '../../domain/value-objects/consent-type';
import { VisitorId } from '../../../visitors-v2/domain/value-objects/visitor-id';
import { Result, okVoid, err } from '../../../shared/domain/result';
import {
  ConsentError,
  ConsentNotFoundError,
} from '../../domain/errors/consent.error';

/**
 * Handler para revocar un consentimiento
 * RGPD Art. 7.3: Derecho a retirar el consentimiento
 */
@CommandHandler(RevokeConsentCommand)
export class RevokeConsentCommandHandler
  implements ICommandHandler<RevokeConsentCommand>
{
  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly repository: ConsentRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: RevokeConsentCommand,
  ): Promise<Result<void, ConsentError>> {
    try {
      const visitorId = VisitorId.create(command.visitorId);
      const consentType = new ConsentType(command.consentType);

      // Buscar el consentimiento activo
      const consentResult = await this.repository.findActiveConsentByType(
        visitorId,
        consentType,
      );

      if (consentResult.isErr()) {
        return err(new ConsentError(consentResult.error.message));
      }

      const consent = consentResult.value;
      if (consent === null) {
        const notFoundError = new ConsentNotFoundError(
          command.visitorId,
          command.consentType,
        );
        return err(notFoundError);
      }

      // Revocar el consentimiento (emite evento)
      const revokedConsent = consent.revoke(command.reason);

      // Merge con el event publisher
      const consentCtx = this.publisher.mergeObjectContext(revokedConsent);

      // Guardar el estado actualizado
      const saveResult = await this.repository.save(consentCtx);
      if (saveResult.isErr()) {
        return err(new ConsentError(saveResult.error.message));
      }

      // CRÍTICO: Commit para despachar los eventos
      consentCtx.commit();

      return okVoid();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      const consentError = new ConsentError(
        `Error al revocar consentimiento: ${message}`,
      );
      return err(consentError);
    }
  }
}
