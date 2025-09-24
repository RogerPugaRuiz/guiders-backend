import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetOnlineCommercialsQuery } from './get-online-commercials.query';
import {
  OnlineCommercialsResponseDto,
  CommercialSummaryDto,
} from '../dtos/commercial-response.dto';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../domain/commercial-connection.domain-service';
import {
  COMMERCIAL_REPOSITORY,
  CommercialRepository,
} from '../../domain/commercial.repository';

/**
 * Handler para la query GetOnlineCommercialsQuery
 * Obtiene todos los comerciales que están online
 */
@QueryHandler(GetOnlineCommercialsQuery)
export class GetOnlineCommercialsQueryHandler
  implements
    IQueryHandler<GetOnlineCommercialsQuery, OnlineCommercialsResponseDto>
{
  private readonly logger = new Logger(GetOnlineCommercialsQueryHandler.name);

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
  ) {}

  async execute(
    __query: GetOnlineCommercialsQuery,
  ): Promise<OnlineCommercialsResponseDto> {
    try {
      // Obtener comerciales online del domain service
      const onlineCommercialIds =
        await this.connectionService.getOnlineCommercials();

      const commercials: CommercialSummaryDto[] = [];

      // Para cada comercial online, obtener detalles
      for (const commercialId of onlineCommercialIds) {
        const commercialResult =
          await this.commercialRepository.findById(commercialId);

        if (commercialResult.isOk() && commercialResult.unwrap()) {
          const commercial = commercialResult.unwrap()!;
          const isActive =
            await this.connectionService.isCommercialActive(commercialId);

          commercials.push({
            id: commercial.id.value,
            name: commercial.name.value,
            connectionStatus: commercial.connectionStatus.value,
            lastActivity: commercial.lastActivity.value,
            isActive,
          });
        }
      }

      return {
        commercials,
        count: commercials.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error al obtener comerciales online:', error);
      return {
        commercials: [],
        count: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
