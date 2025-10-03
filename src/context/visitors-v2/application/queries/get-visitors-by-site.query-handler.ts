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
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../../company/domain/company.repository';

@QueryHandler(GetVisitorsBySiteQuery)
export class GetVisitorsBySiteQueryHandler
  implements IQueryHandler<GetVisitorsBySiteQuery, SiteVisitorsResponseDto>
{
  private readonly logger = new Logger(GetVisitorsBySiteQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
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

      const { visitors, totalCount } = visitorsResult.value;

      // Resolver nombre real del sitio desde el contexto de company.
      // Estrategia: buscar el site en las compañías y utilizar su canonicalDomain como nombre preferente.
      // Fallback: mantener placeholder si no se encuentra.
      const siteName = await resolveSiteName(this.companyRepository, siteId);

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
        `Encontrados ${visitorDtos.length} visitantes en esta página (${totalCount} totales) para sitio ${query.siteId}`,
      );

      return {
        siteId: query.siteId,
        siteName,
        visitors: visitorDtos,
        totalCount, // ✅ Ahora usa el count real del repositorio
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

// Métodos privados auxiliares
export interface HasToPrimitives<T> {
  toPrimitives(): T;
}
// Nota: preferimos el dominio canónico como nombre visible; si no, usamos el nombre del site (que puede ser genérico en el mapper actual).
// Si no se encuentra el site, devolvemos un placeholder explícito.
async function resolveSiteName(
  companyRepository: CompanyRepository,
  siteId: SiteId,
): Promise<string> {
  try {
    const companiesResult = await companyRepository.findAll();
    if (companiesResult.isErr()) return `Sitio ${siteId.value}`;
    for (const company of companiesResult.value) {
      const site = company.getSites().findSiteById(siteId.value);
      if (site) {
        const primitives = site.toPrimitives() as {
          name: string;
          canonicalDomain: string;
        };
        return (
          primitives.canonicalDomain ||
          primitives.name ||
          `Sitio ${siteId.value}`
        );
      }
    }
    return `Sitio ${siteId.value}`;
  } catch {
    return `Sitio ${siteId.value}`;
  }
}
