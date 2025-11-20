import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateCommercialActivityCommand } from './update-commercial-activity.command';
import { CommercialRepository } from '../../domain/commercial.repository';
import { COMMERCIAL_REPOSITORY } from '../../domain/commercial.repository';
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from '../../domain/commercial-connection.domain-service';
import { CommercialConnectionDomainService } from '../../domain/commercial-connection.domain-service';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialLastActivity } from '../../domain/value-objects/commercial-last-activity';

/**
 * Handler para el comando UpdateCommercialActivityCommand
 * Se encarga de actualizar la última actividad de un comercial
 */
@CommandHandler(UpdateCommercialActivityCommand)
export class UpdateCommercialActivityCommandHandler
  implements ICommandHandler<UpdateCommercialActivityCommand>
{
  private readonly logger = new Logger(
    UpdateCommercialActivityCommandHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: UpdateCommercialActivityCommand): Promise<void> {
    this.logger.debug(
      `Actualizando actividad de comercial: ${command.commercialId}`,
    );

    try {
      const commercialId = new CommercialId(command.commercialId);
      const activity = CommercialLastActivity.now();

      // Actualizar actividad en Redis (más rápido)
      await this.connectionService.updateLastActivity(commercialId, activity);

      // Buscar el comercial para actualizar en MongoDB si es necesario
      const commercialResult =
        await this.commercialRepository.findById(commercialId);

      if (commercialResult.isOk() && commercialResult.unwrap()) {
        const commercial = commercialResult.unwrap()!;
        const updatedCommercial = commercial.updateHeartbeat();

        // Guardar y publicar eventos
        const aggCtx = this.publisher.mergeObjectContext(updatedCommercial);
        await this.commercialRepository.update(aggCtx);
        aggCtx.commit();
      }

      this.logger.debug(
        `Actividad actualizada para comercial: ${commercialId.value}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar actividad del comercial ${command.commercialId}:`,
        error,
      );
      throw error;
    }
  }
}
