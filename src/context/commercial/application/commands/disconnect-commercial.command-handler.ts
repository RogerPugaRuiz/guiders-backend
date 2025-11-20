import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { DisconnectCommercialCommand } from './disconnect-commercial.command';
import { CommercialRepository } from '../../domain/commercial.repository';
import { COMMERCIAL_REPOSITORY } from '../../domain/commercial.repository';
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from '../../domain/commercial-connection.domain-service';
import { CommercialConnectionDomainService } from '../../domain/commercial-connection.domain-service';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialConnectionStatus } from '../../domain/value-objects/commercial-connection-status';

/**
 * Handler para el comando DisconnectCommercialCommand
 * Se encarga de desconectar un comercial del sistema
 */
@CommandHandler(DisconnectCommercialCommand)
export class DisconnectCommercialCommandHandler
  implements ICommandHandler<DisconnectCommercialCommand>
{
  private readonly logger = new Logger(DisconnectCommercialCommandHandler.name);

  constructor(
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: DisconnectCommercialCommand): Promise<void> {
    this.logger.log(`Desconectando comercial: ${command.commercialId}`);

    try {
      const commercialId = new CommercialId(command.commercialId);

      // Buscar el comercial existente
      const commercialResult =
        await this.commercialRepository.findById(commercialId);

      if (!commercialResult.isOk() || !commercialResult.unwrap()) {
        this.logger.warn(
          `Comercial no encontrado para desconexión: ${command.commercialId}`,
        );
        return;
      }

      const commercial = commercialResult.unwrap()!;
      const offlineStatus = CommercialConnectionStatus.offline();

      // Actualizar estado del comercial a offline
      const updatedCommercial =
        commercial.changeConnectionStatus(offlineStatus);

      // Actualizar estado en Redis
      await this.connectionService.setConnectionStatus(
        commercialId,
        offlineStatus,
      );

      // Guardar y publicar eventos
      const aggCtx = this.publisher.mergeObjectContext(updatedCommercial);
      await this.commercialRepository.update(aggCtx);
      aggCtx.commit();

      this.logger.log(
        `Comercial desconectado exitosamente: ${commercialId.value}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al desconectar comercial ${command.commercialId}:`,
        error,
      );
      throw error;
    }
  }
}
