import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetAvailableCommercialsQuery } from './get-available-commercials.query';
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
 * Handler para la query GetAvailableCommercialsQuery
 * Obtiene todos los comerciales que están disponibles (online y no busy)
 */
@QueryHandler(GetAvailableCommercialsQuery)
export class GetAvailableCommercialsQueryHandler
  implements
    IQueryHandler<GetAvailableCommercialsQuery, OnlineCommercialsResponseDto>
{
  private readonly logger = new Logger(
    GetAvailableCommercialsQueryHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
  ) {}

  async execute(
    __query: GetAvailableCommercialsQuery,
  ): Promise<OnlineCommercialsResponseDto> {
    try {
      // Obtener comerciales disponibles del domain service
      const availableCommercialIds =
        await this.connectionService.getAvailableCommercials();

      const commercials: CommercialSummaryDto[] = [];

      // Para cada comercial disponible, obtener detalles
      for (const commercialId of availableCommercialIds) {
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
      this.logger.error('Error al obtener comerciales disponibles:', error);
      return {
        commercials: [],
        count: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
