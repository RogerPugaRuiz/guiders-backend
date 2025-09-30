import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorsWithQueuedChatsByTenantQuery } from './get-visitors-with-queued-chats-by-tenant.query';
import {
  TenantVisitorsQueuedChatsResponseDto,
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
import { Uuid } from '../../../shared/domain/value-objects/uuid';
import {
  IChatRepository,
  CHAT_V2_REPOSITORY,
} from '../../../conversations-v2/domain/chat.repository';

@QueryHandler(GetVisitorsWithQueuedChatsByTenantQuery)
export class GetVisitorsWithQueuedChatsByTenantQueryHandler
  implements
    IQueryHandler<
      GetVisitorsWithQueuedChatsByTenantQuery,
      TenantVisitorsQueuedChatsResponseDto
    >
{
  private readonly logger = new Logger(
    GetVisitorsWithQueuedChatsByTenantQueryHandler.name,
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
    query: GetVisitorsWithQueuedChatsByTenantQuery,
  ): Promise<TenantVisitorsQueuedChatsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo visitantes con chats en cola para tenant: ${query.tenantId}`,
      );

      const tenantId = new TenantId(query.tenantId);

      const visitorsResult =
        await this.visitorRepository.findWithQueuedChatsByTenantId(tenantId, {
          limit: query.limit,
          offset: query.offset,
        });

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes con chats en cola del tenant ${query.tenantId}: ${visitorsResult.error.message}`,
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
            waitingTimeSeconds: undefined, // TODO: Calcular tiempo real de espera
          };
        },
      );

      // Calcular sitios únicos con chats en cola
      const uniqueSites = new Set(
        visitors.map((v) => v.getSiteId().getValue()),
      );
      const sitesWithQueuedChats = uniqueSites.size;

      // Calcular tiempo promedio de espera (placeholder)
      const averageWaitingTime = 0; // TODO: Implementar cálculo real cuando se integre con chats

      // Obtener chats en cola para el tenant
      const pendingChatIds = await getQueuedChatIdsByTenant(
        this.chatRepository,
        tenantId,
      );

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes con chats en cola para tenant ${query.tenantId} en ${sitesWithQueuedChats} sitios, ${pendingChatIds.length} chats pendientes`,
      );

      return {
        tenantId: query.tenantId,
        companyName,
        visitors: visitorDtos,
        totalCount: visitorDtos.length,
        sitesWithQueuedChats,
        averageWaitingTime,
        pendingChatIds,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error en GetVisitorsWithQueuedChatsByTenantQueryHandler: ${(error as Error).message}`,
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

// Función auxiliar para obtener chat IDs en cola de un tenant
async function getQueuedChatIdsByTenant(
  chatRepository: IChatRepository,
  tenantId: TenantId,
): Promise<string[]> {
  try {
    // Obtener chats en cola usando getPendingQueue con filtros apropiados
    const queuedChatsResult = await chatRepository.getPendingQueue(
      tenantId.getValue(), // companyId (actualmente es tenantId)
      100, // límite de chats a obtener
    );

    if (queuedChatsResult.isOk()) {
      const queuedChats = queuedChatsResult.value;

      // Extraer IDs de los chats en cola
      const queuedChatIds = queuedChats.map((chat) => chat.id.getValue());

      return queuedChatIds;
    }

    return [];
  } catch {
    // En caso de error, retornar array vacío
    return [];
  }
}
