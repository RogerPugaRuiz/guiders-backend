import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetCommercialAvailabilityBySiteQuery } from './get-commercial-availability-by-site.query';
import { CommercialAvailabilityResponseDto } from '../dtos/commercial-response.dto';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../domain/commercial-connection.domain-service';

/**
 * Handler para la query GetCommercialAvailabilityBySiteQuery
 * Obtiene la disponibilidad de comerciales para un sitio específico
 *
 * NOTA: La implementación actual retorna disponibilidad de TODOS los comerciales online
 * porque el modelo Commercial actual NO tiene tenantId/siteId.
 * TODO: Agregar tenantId al modelo Commercial y filtrar por tenantId del siteId recibido
 */
@QueryHandler(GetCommercialAvailabilityBySiteQuery)
export class GetCommercialAvailabilityBySiteQueryHandler
  implements
    IQueryHandler<
      GetCommercialAvailabilityBySiteQuery,
      CommercialAvailabilityResponseDto
    >
{
  private readonly logger = new Logger(
    GetCommercialAvailabilityBySiteQueryHandler.name,
  );

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
  ) {}

  async execute(
    query: GetCommercialAvailabilityBySiteQuery,
  ): Promise<CommercialAvailabilityResponseDto> {
    try {
      this.logger.log(
        `Consultando disponibilidad de comerciales para siteId: ${query.siteId}`,
      );

      // Obtener comerciales disponibles (online + no busy) del domain service
      // NOTA: Actualmente retorna TODOS los comerciales disponibles del sistema
      // porque Commercial no tiene tenantId/siteId
      const availableCommercialIds =
        await this.connectionService.getAvailableCommercials();

      const onlineCount = availableCommercialIds.length;
      const available = onlineCount > 0;

      this.logger.log(
        `Disponibilidad para siteId ${query.siteId}: ${available} (${onlineCount} comerciales online)`,
      );

      return {
        available,
        onlineCount,
        timestamp: new Date().toISOString(),
        siteId: query.siteId,
      };
    } catch (error) {
      this.logger.error(
        `Error al consultar disponibilidad para siteId ${query.siteId}:`,
        error,
      );

      // En caso de error, retornar disponibilidad false por seguridad
      return {
        available: false,
        onlineCount: 0,
        timestamp: new Date().toISOString(),
        siteId: query.siteId,
      };
    }
  }
}
