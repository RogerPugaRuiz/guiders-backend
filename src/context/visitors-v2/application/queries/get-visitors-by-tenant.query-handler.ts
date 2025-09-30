import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorsByTenantQuery } from './get-visitors-by-tenant.query';
import {
  TenantVisitorsResponseDto,
  TenantVisitorInfoDto,
} from '../dtos/tenant-visitors-response.dto';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { TenantId } from '../../domain/value-objects/tenant-id';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '../../../company/domain/company.repository';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../conversations-v2/domain/chat.repository';
import { Uuid } from '../../../shared/domain/value-objects/uuid';

@QueryHandler(GetVisitorsByTenantQuery)
export class GetVisitorsByTenantQueryHandler
  implements IQueryHandler<GetVisitorsByTenantQuery, TenantVisitorsResponseDto>
{
  private readonly logger = new Logger(GetVisitorsByTenantQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: GetVisitorsByTenantQuery,
  ): Promise<TenantVisitorsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo visitantes para tenant: ${query.tenantId}, incluirOffline: ${query.includeOffline}`,
      );

      const tenantId = new TenantId(query.tenantId);

      const visitorsResult =
        await this.visitorRepository.findByTenantIdWithDetails(tenantId, {
          includeOffline: query.includeOffline,
          limit: query.limit,
          offset: query.offset,
        });

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes del tenant ${query.tenantId}: ${visitorsResult.error.message}`,
        );
        throw new Error(visitorsResult.error.message);
      }

      const visitors = visitorsResult.value;

      // Resolver nombre de la empresa desde el contexto de company
      const companyName = await resolveCompanyName(
        this.companyRepository,
        tenantId,
      );

      // Resolver nombres de sitios de una vez para evitar múltiples consultas
      const siteNamesMap = await resolveSiteNames(
        this.companyRepository,
        tenantId,
      );

      const visitorDtos: TenantVisitorInfoDto[] = visitors.map((visitor) => {
        const sessions = visitor.getSessions();
        const activeSessions = sessions.filter((session) => session.isActive());
        const latestSession =
          activeSessions.length > 0
            ? activeSessions[activeSessions.length - 1]
            : sessions[sessions.length - 1];

        const siteId = visitor.getSiteId().getValue();
        const siteName = siteNamesMap.get(siteId) || `Sitio ${siteId}`;

        return {
          id: visitor.getId().getValue(),
          fingerprint: visitor.getFingerprint().getValue(),
          connectionStatus: activeSessions.length > 0 ? 'ONLINE' : 'OFFLINE',
          siteId,
          siteName,
          currentUrl: undefined, // TODO: Implementar cuando se agregue currentUrl a Session
          userAgent: undefined, // TODO: Implementar cuando se agregue userAgent a Session
          createdAt: visitor.getCreatedAt(),
          lastActivity:
            latestSession?.getLastActivityAt() || visitor.getUpdatedAt(),
        };
      });

      // Calcular sitios únicos activos
      const uniqueSites = new Set(
        visitors.map((v) => v.getSiteId().getValue()),
      );
      const activeSitesCount = uniqueSites.size;

      // Obtener chat IDs pendientes del tenant
      const pendingChatIds = await getPendingChatIdsByTenant(
        this.chatRepository,
        tenantId,
      );

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes para tenant ${query.tenantId} en ${activeSitesCount} sitios`,
      );

      return {
        tenantId: query.tenantId,
        companyName,
        visitors: visitorDtos,
        totalCount: visitorDtos.length,
        activeSitesCount,
        pendingChatIds,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error en GetVisitorsByTenantQueryHandler: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}

// Función auxiliar para resolver el nombre de la empresa
async function resolveCompanyName(
  companyRepository: CompanyRepository,
  tenantId: TenantId,
): Promise<string> {
  try {
    const companyResult = await companyRepository.findById(
      new Uuid(tenantId.getValue()),
    );
    if (companyResult.isOk()) {
      const primitives = companyResult.value.toPrimitives();
      return primitives.companyName || `Empresa ${tenantId.value}`;
    }
    return `Empresa ${tenantId.value}`;
  } catch {
    return `Empresa ${tenantId.value}`;
  }
}

// Función auxiliar para resolver nombres de sitios de un tenant
async function resolveSiteNames(
  companyRepository: CompanyRepository,
  _tenantId: TenantId,
): Promise<Map<string, string>> {
  const siteNamesMap = new Map<string, string>();

  try {
    const companyResult = await companyRepository.findById(
      new Uuid(_tenantId.getValue()),
    );

    if (companyResult.isOk()) {
      const company = companyResult.value;
      const sites = company.getSites().toPrimitives();

      sites.forEach((site) => {
        const siteName =
          site.canonicalDomain || site.name || `Sitio ${site.id}`;
        siteNamesMap.set(site.id, siteName);
      });
    }

    return siteNamesMap;
  } catch {
    // En caso de error, retornar mapa vacío para usar fallbacks
    return siteNamesMap;
  }
}

// Función auxiliar para obtener chat IDs pendientes de un tenant
async function getPendingChatIdsByTenant(
  chatRepository: IChatRepository,
  _tenantId: TenantId,
): Promise<string[]> {
  try {
    // Obtener chats pendientes usando el método getPendingQueue
    // TODO: Cuando se integre completamente con conversations-v2,
    // este método debería filtrar por tenantId
    const pendingChatsResult = await chatRepository.getPendingQueue(
      undefined, // department (no filtrar por departamento)
      100, // límite de chats a obtener
    );

    if (pendingChatsResult.isOk()) {
      const pendingChats = pendingChatsResult.value;

      // Filtrar chats que pertenecen al tenant específico
      // TODO: Esta lógica debería optimizarse cuando se agregue
      // el campo tenantId a la entidad Chat
      const tenantChatIds = pendingChats
        .filter((_chat) => {
          // Por ahora retornamos todos los chats pendientes
          // En el futuro, filtrar por: chat.getTenantId().getValue() === tenantId.getValue()
          return true;
        })
        .map((chat) => chat.id.getValue());

      return tenantChatIds;
    }

    return [];
  } catch {
    // En caso de error, retornar array vacío
    return [];
  }
}
