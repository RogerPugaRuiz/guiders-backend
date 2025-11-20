import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetVisitorActivityQuery } from './get-visitor-activity.query';
import { GetVisitorActivityResponseDto } from '../dtos/get-visitor-activity-response.dto';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../domain/visitor-v2.repository';
import {
  TRACKING_EVENT_REPOSITORY,
  TrackingEventRepository,
} from 'src/context/tracking-v2/domain/tracking-event.repository';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from 'src/context/conversations-v2/domain/chat.repository';
import {
  LEAD_SCORING_SERVICE,
  LeadScoringService,
} from 'src/context/lead-scoring/domain/lead-scoring.service';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { VisitorId as ChatVisitorId } from 'src/context/conversations-v2/domain/value-objects/visitor-id';

@QueryHandler(GetVisitorActivityQuery)
export class GetVisitorActivityQueryHandler
  implements IQueryHandler<GetVisitorActivityQuery, GetVisitorActivityResponseDto>
{
  constructor(
    @Inject(VISITOR_V2_REPOSITORY)
    private readonly visitorRepository: VisitorV2Repository,
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly trackingRepository: TrackingEventRepository,
    @Inject(CHAT_V2_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(LEAD_SCORING_SERVICE)
    private readonly leadScoringService: LeadScoringService,
  ) {}

  async execute(
    query: GetVisitorActivityQuery,
  ): Promise<GetVisitorActivityResponseDto> {
    const visitorId = new VisitorId(query.visitorId);

    // Obtener datos del visitante
    const visitorResult = await this.visitorRepository.findById(visitorId);
    if (visitorResult.isErr()) {
      throw new NotFoundException(
        `Visitante con ID ${query.visitorId} no encontrado`,
      );
    }
    const visitor = visitorResult.unwrap();

    // Obtener estadísticas de tracking (páginas visitadas)
    const trackingStatsResult =
      await this.trackingRepository.getStatsByVisitor(visitorId);

    let totalPagesVisited = 0;
    if (trackingStatsResult.isOk()) {
      const stats = trackingStatsResult.unwrap();
      totalPagesVisited = stats.eventsByType['PAGE_VIEW'] || 0;
    }

    // Obtener chats del visitante
    const chatVisitorId = ChatVisitorId.create(query.visitorId);
    const chatsResult = await this.chatRepository.findByVisitorId(chatVisitorId);
    const totalChats = chatsResult.isOk() ? chatsResult.unwrap().length : 0;

    // Calcular estadísticas del visitante
    const sessions = visitor.getSessions();
    const totalSessions = sessions.length;
    const totalTimeConnectedMs = sessions.reduce(
      (total, session) => total + session.getDuration(),
      0,
    );

    // Obtener última actividad
    const lastActivityAt =
      sessions.length > 0
        ? sessions
            .map((s) => s.getLastActivityAt())
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : visitor.getUpdatedAt();

    // Calcular lead score
    const leadScore = this.leadScoringService.calculateScore({
      totalSessions,
      totalPagesVisited,
      totalTimeConnectedMs,
      totalChats,
      lifecycle: visitor.getLifecycle().getValue(),
    });

    return {
      visitorId: query.visitorId,
      totalSessions,
      totalChats,
      totalPagesVisited,
      totalTimeConnectedMs,
      currentConnectionStatus: visitor.getConnectionStatus(),
      lifecycle: visitor.getLifecycle().getValue(),
      lastActivityAt: lastActivityAt.toISOString(),
      currentUrl: visitor.getCurrentUrl(),
      leadScore: leadScore.toPrimitives(),
    };
  }
}
