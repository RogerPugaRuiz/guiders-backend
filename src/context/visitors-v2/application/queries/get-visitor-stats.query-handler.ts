import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetVisitorStatsQuery } from './get-visitor-stats.query';
import {
  VisitorStatsResponseDto,
  TopPageDto,
  TopSourceDto,
} from '../dtos/visitor-stats-response.dto';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import { TenantId } from '../../domain/value-objects/tenant-id';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../conversations-v2/domain/chat.repository';
import {
  VisitorConnectionDomainService,
  VISITOR_CONNECTION_DOMAIN_SERVICE,
} from '../../domain/visitor-connection.domain-service';
import { ConnectionStatus } from '../../domain/value-objects/visitor-connection';
import { VisitorLifecycle } from '../../domain/value-objects/visitor-lifecycle';

@QueryHandler(GetVisitorStatsQuery)
export class GetVisitorStatsQueryHandler
  implements IQueryHandler<GetVisitorStatsQuery, VisitorStatsResponseDto>
{
  private readonly logger = new Logger(GetVisitorStatsQueryHandler.name);

  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(VISITOR_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: VisitorConnectionDomainService,
  ) {}

  async execute(query: GetVisitorStatsQuery): Promise<VisitorStatsResponseDto> {
    this.logger.log(`Obteniendo estadísticas para tenant: ${query.tenantId}`);

    try {
      const tenantId = new TenantId(query.tenantId);

      const visitorsResult =
        await this.visitorRepository.findByTenantId(tenantId);

      if (visitorsResult.isErr()) {
        this.logger.error(
          `Error al obtener visitantes: ${visitorsResult.error.message}`,
        );
        throw new Error(visitorsResult.error.message);
      }

      const visitors = visitorsResult.value;
      const totalVisitors = visitors.length;

      let onlineVisitors = 0;
      for (const visitor of visitors) {
        try {
          const status = await this.connectionService.getConnectionStatus(
            visitor.getId(),
          );
          if (status.isOnline()) {
            onlineVisitors++;
          }
        } catch {
          const activeSessions = visitor
            .getSessions()
            .filter((s) => s.isActive());
          if (activeSessions.length > 0) {
            onlineVisitors++;
          }
        }
      }

      let newVisitors = 0;
      let returningVisitors = 0;
      let withPendingChats = 0;
      let totalSessionDuration = 0;
      let totalSessions = 0;

      for (const visitor of visitors) {
        const sessions = visitor.getSessions();
        const sessionCount = sessions.length;

        if (sessionCount <= 1) {
          newVisitors++;
        } else {
          returningVisitors++;
        }

        for (const session of sessions) {
          totalSessionDuration += session.getDuration();
          totalSessions++;
        }

        try {
          const pendingChats = await this.chatRepository.getPendingQueue(
            undefined,
            100,
          );
          if (pendingChats.isOk()) {
            const visitorId = visitor.getId().getValue();
            const hasPending = pendingChats.value.some(
              (chat) => chat.visitorId.getValue() === visitorId,
            );
            if (hasPending) {
              withPendingChats++;
            }
          }
        } catch {
          // Ignore
        }
      }

      const averageSessionDuration =
        totalSessions > 0
          ? Math.round(totalSessionDuration / totalSessions / 1000)
          : 0;

      const bouncedVisitors = visitors.filter((v) => {
        const sessions = v.getSessions();
        return sessions.length === 1 && sessions[0].getDuration() < 10000;
      }).length;
      const bounceRate =
        totalVisitors > 0
          ? Math.round((bouncedVisitors / totalVisitors) * 100)
          : 0;

      const convertedVisitors = visitors.filter((v) => {
        const lifecycle = v.getLifecycle().getValue();
        return (
          lifecycle === VisitorLifecycle.LEAD ||
          lifecycle === VisitorLifecycle.CONVERTED
        );
      }).length;
      const conversionRate =
        totalVisitors > 0
          ? Math.round((convertedVisitors / totalVisitors) * 100)
          : 0;

      const pageCounts = new Map<string, { title?: string; views: number }>();
      for (const visitor of visitors) {
        for (const session of visitor.getSessions()) {
          const url = session.getCurrentUrl();
          if (url) {
            const existing = pageCounts.get(url);
            if (existing) {
              existing.views++;
            } else {
              pageCounts.set(url, { views: 1 });
            }
          }
        }
      }
      const topPages: TopPageDto[] = Array.from(pageCounts.entries())
        .sort((a, b) => b[1].views - a[1].views)
        .slice(0, 10)
        .map(([url, data]) => ({
          url,
          title: data.title,
          views: data.views,
        }));

      const sourceCounts = new Map<string, number>();
      for (const visitor of visitors) {
        for (const session of visitor.getSessions()) {
          const ip = session['ipAddress'];
          const source = ip ? `IP:${ip.substring(0, 6)}...` : 'direct';
          const existing = sourceCounts.get(source);
          if (existing !== undefined) {
            sourceCounts.set(source, existing + 1);
          } else {
            sourceCounts.set(source, 1);
          }
        }
      }
      const topSources: TopSourceDto[] = Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, count]) => ({
          source,
          visitors: count,
        }));

      this.logger.log(
        `Estadísticas calculadas para tenant ${query.tenantId}: ${totalVisitors} visitantes, ${onlineVisitors} online`,
      );

      return {
        totalVisitors,
        onlineVisitors,
        newVisitors,
        returningVisitors,
        withPendingChats,
        averageSessionDuration,
        bounceRate,
        conversionRate,
        topPages,
        topSources,
      };
    } catch (error) {
      this.logger.error(
        `Error en GetVisitorStatsQueryHandler: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
