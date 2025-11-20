import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CommercialHeartbeatCommand } from './commercial-heartbeat.command';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../domain/commercial-connection.domain-service';
import {
  COMMERCIAL_REPOSITORY,
  CommercialRepository,
} from '../../domain/commercial.repository';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialLastActivity } from '../../domain/value-objects/commercial-last-activity';

/**
 * Handler para el comando CommercialHeartbeatCommand
 * Se encarga de actualizar el heartbeat de un comercial
 */
@CommandHandler(CommercialHeartbeatCommand)
export class CommercialHeartbeatCommandHandler
  implements ICommandHandler<CommercialHeartbeatCommand, void>
{
  private readonly logger = new Logger(CommercialHeartbeatCommandHandler.name);

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CommercialHeartbeatCommand): Promise<void> {
    this.logger.log(
      `Procesando heartbeat para comercial: ${command.commercialId}`,
    );

    try {
      const commercialId = new CommercialId(command.commercialId);
      const newActivity = CommercialLastActivity.now();

      // Actualizar última actividad en el domain service
      await this.connectionService.updateLastActivity(
        commercialId,
        newActivity,
      );

      // Buscar el comercial para actualizar el aggregate
      const commercialResult =
        await this.commercialRepository.findById(commercialId);

      if (commercialResult.isErr()) {
        this.logger.warn(
          `No se encontró el comercial con ID: ${command.commercialId}`,
        );
        return;
      }

      const commercial = commercialResult.unwrap();
      if (!commercial) {
        this.logger.warn(
          `Comercial no encontrado con ID: ${command.commercialId}`,
        );
        return;
      }

      // Actualizar heartbeat del aggregate
      const updatedCommercial = commercial.updateHeartbeat();

      // Publicar eventos
      const aggCtx = this.publisher.mergeObjectContext(updatedCommercial);
      await this.commercialRepository.update(aggCtx);
      aggCtx.commit();

      this.logger.log(
        `Heartbeat actualizado exitosamente para comercial: ${command.commercialId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al procesar heartbeat para comercial ${command.commercialId}:`,
        error,
      );
      throw error;
    }
  }
}
