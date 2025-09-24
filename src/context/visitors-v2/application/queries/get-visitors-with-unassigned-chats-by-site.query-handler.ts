import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorsWithUnassignedChatsBySiteQuery } from './get-visitors-with-unassigned-chats-by-site.query';
import {
  SiteVisitorsUnassignedChatsResponseDto,
  SiteVisitorWithChatDto,
} from '../dtos/site-visitors-response.dto';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { SiteId } from '../../domain/value-objects/site-id';

@QueryHandler(GetVisitorsWithUnassignedChatsBySiteQuery)
export class GetVisitorsWithUnassignedChatsBySiteQueryHandler
  implements
    IQueryHandler<
      GetVisitorsWithUnassignedChatsBySiteQuery,
      SiteVisitorsUnassignedChatsResponseDto
    >
{
  private readonly logger = new Logger(
    GetVisitorsWithUnassignedChatsBySiteQueryHandler.name,
  );

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
  ) {}

  async execute(
    query: GetVisitorsWithUnassignedChatsBySiteQuery,
  ): Promise<SiteVisitorsUnassignedChatsResponseDto> {
    try {
      this.logger.log(
        `Obteniendo visitantes con chats sin asignar para sitio: ${query.siteId}`,
      );

      const siteId = new SiteId(query.siteId);

      const visitorsResult =
        await this.visitorRepository.findWithUnassignedChatsBySiteId(siteId, {
          limit: query.limit,
          offset: query.offset,
        });

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes con chats sin asignar del sitio ${query.siteId}: ${visitorsResult.error.message}`,
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
          chatStatus: 'UNASSIGNED', // Sabemos que tienen chats sin asignar
          chatId: undefined, // TODO: Implementar cuando se agregue relación con chat
          waitTime: undefined, // TODO: Calcular basado en creación del chat
        };
      });

      this.logger.log(
        `Encontrados ${visitorDtos.length} visitantes con chats sin asignar para sitio ${query.siteId}`,
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
        `Error en GetVisitorsWithUnassignedChatsBySiteQueryHandler: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
