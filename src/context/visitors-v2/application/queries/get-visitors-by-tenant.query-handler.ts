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
import { VisitorV2 } from '../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../conversations-v2/domain/value-objects/visitor-id';
import {
  VisitorConnectionDomainService,
  VISITOR_CONNECTION_DOMAIN_SERVICE,
} from '../../domain/visitor-connection.domain-service';
import { VisitorId as VisitorIdV2 } from '../../domain/value-objects/visitor-id';

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
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
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
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        });

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes del tenant ${query.tenantId}: ${visitorsResult.error.message}`,
        );
        throw new Error(visitorsResult.error.message);
      }

      const { visitors, totalCount } = visitorsResult.value;

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

      // Obtener chats pendientes del tenant con información del visitante
      const pendingChatsMap = await getPendingChatsByTenant(
        this.chatRepository,
        tenantId,
      );

      // Obtener conteo total de chats por visitante
      const totalChatsCountMap = await getTotalChatsByVisitors(
        this.chatRepository,
        visitors,
      );

      // Mapear los chats pendientes a cada visitante
      const visitorDtos: TenantVisitorInfoDto[] = await Promise.all(
        visitors.map(async (visitor) => {
          const sessions = visitor.getSessions();
          const activeSessions = sessions.filter((session) =>
            session.isActive(),
          );
          const latestSession =
            activeSessions.length > 0
              ? activeSessions[activeSessions.length - 1]
              : sessions[sessions.length - 1];

          const siteId = visitor.getSiteId().getValue();
          const siteName = siteNamesMap.get(siteId) || `Sitio ${siteId}`;

          // Filtrar los chats pendientes que correspondan a este visitante
          const visitorId = visitor.getId().getValue();
          const visitorPendingChatIds = pendingChatsMap.get(visitorId) || [];
          const totalChatsCount = totalChatsCountMap.get(visitorId) || 0;

          // Obtener estado de conexión real desde Redis
          let connectionStatus = 'OFFLINE';
          try {
            const visitorIdVO = new VisitorIdV2(visitorId);
            const status =
              await this.connectionService.getConnectionStatus(visitorIdVO);
            connectionStatus = status.getValue().toUpperCase();
          } catch {
            // Fallback: Si no hay estado en Redis, usar lógica de sesiones activas
            connectionStatus = activeSessions.length > 0 ? 'ONLINE' : 'OFFLINE';
          }

          return {
            id: visitor.getId().getValue(),
            fingerprint: visitor.getFingerprint().getValue(),
            connectionStatus,
            siteId,
            siteName,
            currentUrl: undefined, // TODO: Implementar cuando se agregue currentUrl a Session
            userAgent: undefined, // TODO: Implementar cuando se agregue userAgent a Session
            createdAt: visitor.getCreatedAt(),
            lastActivity:
              latestSession?.getLastActivityAt() || visitor.getUpdatedAt(),
            pendingChatIds: visitorPendingChatIds,
            totalChatsCount,
          };
        }),
      );

      // Calcular sitios únicos activos
      const uniqueSites = new Set(
        visitors.map((v) => v.getSiteId().getValue()),
      );
      const activeSitesCount = uniqueSites.size;

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes en esta página (${totalCount} totales) para tenant ${query.tenantId} en ${activeSitesCount} sitios`,
      );

      return {
        companyId: query.tenantId,
        companyName,
        visitors: visitorDtos,
        totalCount, // ✅ Ahora usa el count real del repositorio
        activeSitesCount,
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

// Función auxiliar para obtener chats pendientes agrupados por visitorId
async function getPendingChatsByTenant(
  chatRepository: IChatRepository,
  _tenantId: TenantId,
): Promise<Map<string, string[]>> {
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

      // Agrupar chats pendientes por visitorId
      const chatsByVisitor = new Map<string, string[]>();

      pendingChats.forEach((chat) => {
        const visitorId = chat.visitorId.getValue();
        const chatId = chat.id.getValue();

        if (!chatsByVisitor.has(visitorId)) {
          chatsByVisitor.set(visitorId, []);
        }
        chatsByVisitor.get(visitorId)!.push(chatId);
      });

      return chatsByVisitor;
    }

    return new Map();
  } catch {
    // En caso de error, retornar mapa vacío
    return new Map();
  }
}

// Función auxiliar para obtener el conteo total de chats por visitante
async function getTotalChatsByVisitors(
  chatRepository: IChatRepository,
  visitors: VisitorV2[],
): Promise<Map<string, number>> {
  const totalChatsMap = new Map<string, number>();

  try {
    // Obtener el conteo de chats para cada visitante
    await Promise.all(
      visitors.map(async (visitor) => {
        const visitorId = visitor.getId().getValue();
        const visitorIdVO = VisitorId.create(visitorId);

        try {
          const chatsResult = await chatRepository.findByVisitorId(visitorIdVO);

          if (chatsResult.isOk()) {
            const chats = chatsResult.value;
            totalChatsMap.set(visitorId, chats.length);
          } else {
            totalChatsMap.set(visitorId, 0);
          }
        } catch {
          totalChatsMap.set(visitorId, 0);
        }
      }),
    );

    return totalChatsMap;
  } catch {
    // En caso de error, retornar mapa vacío
    return totalChatsMap;
  }
}
