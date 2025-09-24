import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConnectCommercialCommand } from './connect-commercial.command';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../domain/commercial-connection.domain-service';
import {
  COMMERCIAL_REPOSITORY,
  CommercialRepository,
} from '../../domain/commercial.repository';
import { Commercial } from '../../domain/commercial.aggregate';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialName } from '../../domain/value-objects/commercial-name';
import { CommercialConnectionStatus } from '../../domain/value-objects/commercial-connection-status';
import { CommercialLastActivity } from '../../domain/value-objects/commercial-last-activity';

/**
 * Handler para el comando ConnectCommercialCommand
 * Se encarga de conectar un comercial al sistema
 */
@CommandHandler(ConnectCommercialCommand)
export class ConnectCommercialCommandHandler
  implements ICommandHandler<ConnectCommercialCommand, void>
{
  private readonly logger = new Logger(ConnectCommercialCommandHandler.name);

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ConnectCommercialCommand): Promise<void> {
    this.logger.log(
      `Conectando comercial: ${command.commercialId} (${command.name})`,
    );

    try {
      const commercialId = new CommercialId(command.commercialId);
      const commercialName = new CommercialName(command.name);
      const onlineStatus = CommercialConnectionStatus.online();

      // Verificar si el comercial ya existe
      const existingCommercialResult =
        await this.commercialRepository.findById(commercialId);

      let commercial: Commercial;

      if (
        existingCommercialResult.isOk() &&
        existingCommercialResult.unwrap()
      ) {
        // Comercial existe, actualizar estado a online
        commercial = existingCommercialResult.unwrap()!;
        commercial = commercial.changeConnectionStatus(onlineStatus);
      } else {
        // Crear nuevo comercial
        commercial = Commercial.create({
          id: commercialId,
          name: commercialName,
          connectionStatus: onlineStatus,
        });
      }

      // Actualizar estado en Redis
      await this.connectionService.setConnectionStatus(
        commercialId,
        onlineStatus,
      );
      await this.connectionService.updateLastActivity(
        commercialId,
        CommercialLastActivity.now(),
      );

      // Guardar en MongoDB y publicar eventos
      const aggCtx = this.publisher.mergeObjectContext(commercial);

      if (
        existingCommercialResult.isOk() &&
        existingCommercialResult.unwrap()
      ) {
        await this.commercialRepository.update(aggCtx);
      } else {
        await this.commercialRepository.save(aggCtx);
      }

      aggCtx.commit();

      this.logger.log(
        `Comercial conectado exitosamente: ${command.commercialId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al conectar comercial ${command.commercialId}:`,
        error,
      );
      throw error;
    }
  }
}
