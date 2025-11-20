import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetCommercialConnectionStatusQuery } from './get-commercial-connection-status.query';
import { CommercialConnectionStatusResponseDto } from '../dtos/commercial-response.dto';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../domain/commercial-connection.domain-service';
import {
  COMMERCIAL_REPOSITORY,
  CommercialRepository,
} from '../../domain/commercial.repository';
import { CommercialId } from '../../domain/value-objects/commercial-id';

/**
 * Handler para la query GetCommercialConnectionStatusQuery
 * Obtiene el estado de conexión de un comercial
 */
@QueryHandler(GetCommercialConnectionStatusQuery)
export class GetCommercialConnectionStatusQueryHandler
  implements
    IQueryHandler<
      GetCommercialConnectionStatusQuery,
      CommercialConnectionStatusResponseDto | null
    >
{
  private readonly logger = new Logger(
    GetCommercialConnectionStatusQueryHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
  ) {}

  async execute(
    query: GetCommercialConnectionStatusQuery,
  ): Promise<CommercialConnectionStatusResponseDto | null> {
    try {
      const commercialId = new CommercialId(query.commercialId);

      // Obtener estado del domain service
      const connectionStatus =
        await this.connectionService.getConnectionStatus(commercialId);
      const lastActivity =
        await this.connectionService.getLastActivity(commercialId);
      const isActive =
        await this.connectionService.isCommercialActive(commercialId);

      return {
        commercialId: query.commercialId,
        connectionStatus: connectionStatus.value,
        lastActivity: lastActivity.value,
        isActive,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener estado de conexión para comercial ${query.commercialId}:`,
        error,
      );
      return null;
    }
  }
}
