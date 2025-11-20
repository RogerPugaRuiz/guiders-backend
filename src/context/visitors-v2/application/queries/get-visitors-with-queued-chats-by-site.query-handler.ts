import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorsWithQueuedChatsBySiteQuery } from './get-visitors-with-queued-chats-by-site.query';
import {
  SiteVisitorsQueuedChatsResponseDto,
  SiteVisitorWithChatDto,
} from '../dtos/site-visitors-response.dto';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { SiteId } from '../../domain/value-objects/site-id';

@QueryHandler(GetVisitorsWithQueuedChatsBySiteQuery)
export class GetVisitorsWithQueuedChatsBySiteQueryHandler
  implements
    IQueryHandler<
      GetVisitorsWithQueuedChatsBySiteQuery,
      SiteVisitorsQueuedChatsResponseDto
    >
{
  private readonly logger = new Logger(
    GetVisitorsWithQueuedChatsBySiteQueryHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: GetVisitorsWithQueuedChatsBySiteQuery,
  ): Promise<SiteVisitorsQueuedChatsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo visitantes con chats en cola para sitio: ${query.siteId}`,
      );

      const siteId = new SiteId(query.siteId);

      const visitorsResult =
        await this.visitorRepository.findWithQueuedChatsBySiteId(siteId, {
          limit: query.limit,
          offset: query.offset,
        });

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes con chats en cola del sitio ${query.siteId}: ${visitorsResult.error.message}`,
        );
        throw new Error(visitorsResult.error.message);
      }

      const visitors = visitorsResult.value;

      const visitorDtos: SiteVisitorWithChatDto[] = visitors.map((visitor) => {
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
          chatStatus: 'QUEUED', // Sabemos que tienen chats en cola
          chatId: undefined, // TODO: Implementar cuando se agregue relación con chat
          waitTime: undefined, // TODO: Calcular basado en tiempo en cola
        };
      });

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes con chats en cola para sitio ${query.siteId}`,
      );

      return {
        siteId: query.siteId,
        siteName: `Sitio ${query.siteId}`, // TODO: Obtener nombre real del sitio
        visitors: visitorDtos,
        totalCount: visitorDtos.length,
        averageWaitingTime: 0, // TODO: Calcular tiempo promedio de espera real
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error en GetVisitorsWithQueuedChatsBySiteQueryHandler: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
