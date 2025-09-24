import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorsBySiteQuery } from './get-visitors-by-site.query';
import {
  SiteVisitorsResponseDto,
  SiteVisitorInfoDto,
} from '../dtos/site-visitors-response.dto';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { SiteId } from '../../domain/value-objects/site-id';

@QueryHandler(GetVisitorsBySiteQuery)
export class GetVisitorsBySiteQueryHandler
  implements IQueryHandler<GetVisitorsBySiteQuery, SiteVisitorsResponseDto>
{
  private readonly logger = new Logger(GetVisitorsBySiteQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: GetVisitorsBySiteQuery,
  ): Promise<SiteVisitorsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo visitantes para sitio: ${query.siteId}, incluirOffline: ${query.includeOffline}`,
      );

      const siteId = new SiteId(query.siteId);

      const visitorsResult =
        await this.visitorRepository.findBySiteIdWithDetails(siteId, {
          includeOffline: query.includeOffline,
          limit: query.limit,
          offset: query.offset,
        });

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes del sitio ${query.siteId}: ${visitorsResult.error.message}`,
        );
        throw new Error(visitorsResult.error.message);
      }

      const visitors = visitorsResult.value;

      const visitorDtos: SiteVisitorInfoDto[] = visitors.map((visitor) => {
        const sessions = visitor.getSessions();
        const activeSessions = sessions.filter((session) => session.isActive());
        const latestSession =
          activeSessions.length > 0
            ? activeSessions[activeSessions.length - 1]
            : sessions[sessions.length - 1];

        return {
          id: visitor.getId().getValue(),
          fingerprint: visitor.getFingerprint().getValue(),
          connectionStatus: activeSessions.length > 0 ? 'ONLINE' : 'OFFLINE',
          currentUrl: undefined, // TODO: Implementar cuando se agregue currentUrl a Session
          userAgent: undefined, // TODO: Implementar cuando se agregue userAgent a Session
          createdAt: visitor.getCreatedAt(),
          lastActivity:
            latestSession?.getLastActivityAt() || visitor.getUpdatedAt(),
        };
      });

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes para sitio ${query.siteId}`,
      );

      return {
        siteId: query.siteId,
        siteName: `Sitio ${query.siteId}`, // TODO: Obtener nombre real del sitio
        visitors: visitorDtos,
        totalCount: visitorDtos.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error en GetVisitorsBySiteQueryHandler: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
