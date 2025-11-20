import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorsWithUnassignedChatsByTenantQuery } from './get-visitors-with-unassigned-chats-by-tenant.query';
import {
  TenantVisitorsUnassignedChatsResponseDto,
  TenantVisitorWithChatDto,
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

@QueryHandler(GetVisitorsWithUnassignedChatsByTenantQuery)
export class GetVisitorsWithUnassignedChatsByTenantQueryHandler
  implements
    IQueryHandler<
      GetVisitorsWithUnassignedChatsByTenantQuery,
      TenantVisitorsUnassignedChatsResponseDto
    >
{
  private readonly logger = new Logger(
    GetVisitorsWithUnassignedChatsByTenantQueryHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepository: CompanyRepository,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
  ) {}

  async execute(
    query: GetVisitorsWithUnassignedChatsByTenantQuery,
  ): Promise<TenantVisitorsUnassignedChatsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo visitantes con chats sin asignar para tenant: ${query.tenantId}`,
      );

      const tenantId = new TenantId(query.tenantId);

      const visitorsResult =
        await this.visitorRepository.findWithUnassignedChatsByTenantId(
          tenantId,
          {
            limit: query.limit,
            offset: query.offset,
          },
        );

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes con chats sin asignar del tenant ${query.tenantId}: ${visitorsResult.error.message}`,
        );
        throw new Error(visitorsResult.error.message);
      }

      const visitors = visitorsResult.value;

      // Resolver nombre de la empresa
      const companyName = await resolveCompanyName(
        this.companyRepository,
        tenantId,
      );

      // Resolver nombres de sitios de una vez para evitar múltiples consultas
      const siteNamesMap = await resolveSiteNames(
        this.companyRepository,
        tenantId,
      );

      const visitorDtos: TenantVisitorWithChatDto[] = visitors.map(
        (visitor) => {
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
            // Información del chat (placeholder hasta integración con conversations-v2)
            chatId: undefined,
            chatStatus: undefined,
            chatPriority: undefined,
            chatCreatedAt: undefined,
            assignedCommercialId: undefined,
            waitingTimeSeconds: undefined,
            // Lead score placeholder - TODO: calcular score real
            leadScore: {
              score: 0,
              tier: 'cold' as const,
              signals: {
                isRecurrentVisitor: false,
                hasHighEngagement: false,
                hasInvestedTime: false,
                needsHelp: false,
              },
            },
          };
        },
      );

      // Calcular sitios únicos con chats sin asignar
      const uniqueSites = new Set(
        visitors.map((v) => v.getSiteId().getValue()),
      );
      const sitesWithUnassignedChats = uniqueSites.size;

      // Obtener chat IDs pendientes sin asignar del tenant
      const pendingChatIds = await getUnassignedChatIdsByTenant(
        this.chatRepository,
        tenantId,
      );

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes con chats sin asignar para tenant ${query.tenantId} en ${sitesWithUnassignedChats} sitios`,
      );

      return {
        companyId: query.tenantId,
        companyName,
        visitors: visitorDtos,
        totalCount: visitorDtos.length,
        sitesWithUnassignedChats,
        pendingChatIds,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error en GetVisitorsWithUnassignedChatsByTenantQueryHandler: ${(error as Error).message}`,
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
  tenantId: TenantId,
): Promise<Map<string, string>> {
  const siteNamesMap = new Map<string, string>();

  try {
    const companyResult = await companyRepository.findById(
      new Uuid(tenantId.getValue()),
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

// Función auxiliar para obtener chat IDs sin asignar de un tenant
async function getUnassignedChatIdsByTenant(
  chatRepository: IChatRepository,
  _tenantId: TenantId,
): Promise<string[]> {
  try {
    // Obtener chats sin asignar (pendientes) usando filtros específicos
    const unassignedChatsResult = await chatRepository.getAvailableChats(
      [], // commercialIds vacío para obtener chats no asignados
      { status: ['PENDING'] }, // Solo chats pendientes
      100, // límite de chats a obtener
    );

    if (unassignedChatsResult.isOk()) {
      const unassignedChats = unassignedChatsResult.value;

      // Filtrar chats que pertenecen al tenant específico
      // TODO: Esta lógica debería optimizarse cuando se agregue
      // el campo tenantId a la entidad Chat
      const tenantChatIds = unassignedChats
        .filter((_chat) => {
          // Por ahora retornamos todos los chats sin asignar
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
