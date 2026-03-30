import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { RegisterCommercialFingerprintCommand } from './register-commercial-fingerprint.command';
import { CommercialRepository } from '../../domain/commercial.repository';
import { COMMERCIAL_REPOSITORY } from '../../domain/commercial.repository';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { Result, ok, err } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Error cuando el comercial no existe
 */
export class CommercialNotFoundError extends DomainError {
  constructor(commercialId: string) {
    super(`Comercial con ID ${commercialId} no encontrado`);
    this.name = 'CommercialNotFoundError';
  }
}

/**
 * Error genérico al registrar fingerprint
 */
export class RegisterFingerprintError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'RegisterFingerprintError';
  }
}

/**
 * Handler para registrar un fingerprint de navegador a un comercial
 * Permite que el sistema identifique automáticamente al comercial cuando visite sitios con el SDK
 */
@CommandHandler(RegisterCommercialFingerprintCommand)
export class RegisterCommercialFingerprintCommandHandler
  implements ICommandHandler<RegisterCommercialFingerprintCommand>
{
  private readonly logger = new Logger(
    RegisterCommercialFingerprintCommandHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: RegisterCommercialFingerprintCommand,
  ): Promise<Result<void, DomainError>> {
    this.logger.log(
      `Registrando fingerprint ${command.fingerprint} para comercial ${command.commercialId}`,
    );

    try {
      const commercialId = new CommercialId(command.commercialId);

      // Buscar el comercial
      const commercialResult =
        await this.commercialRepository.findById(commercialId);

      if (commercialResult.isErr()) {
        return err(
          new RegisterFingerprintError(
            `Error al buscar comercial: ${commercialResult.error.message}`,
          ),
        );
      }

      const commercial = commercialResult.unwrap();
      if (!commercial) {
        return err(new CommercialNotFoundError(command.commercialId));
      }

      // Verificar si el fingerprint ya está registrado
      if (commercial.hasFingerprint(command.fingerprint)) {
        this.logger.debug(
          `Fingerprint ${command.fingerprint} ya estaba registrado para comercial ${command.commercialId}`,
        );
        return ok(undefined);
      }

      // Registrar el nuevo fingerprint
      const updatedCommercial = commercial.registerFingerprint(
        command.fingerprint,
      );

      // Guardar y publicar eventos
      const aggCtx = this.publisher.mergeObjectContext(updatedCommercial);
      const saveResult = await this.commercialRepository.update(aggCtx);

      if (saveResult.isErr()) {
        return saveResult;
      }

      aggCtx.commit();

      this.logger.log(
        `✅ Fingerprint ${command.fingerprint} registrado exitosamente para comercial ${command.commercialId}`,
      );

      return ok(undefined);
    } catch (error) {
      const errorMessage = `Error al registrar fingerprint: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      return err(new RegisterFingerprintError(errorMessage));
    }
  }
}
