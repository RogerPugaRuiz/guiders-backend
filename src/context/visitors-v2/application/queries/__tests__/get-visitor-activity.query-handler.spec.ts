import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetVisitorActivityQueryHandler } from '../get-visitor-activity.query-handler';
import { GetVisitorActivityQuery } from '../get-visitor-activity.query';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../../domain/visitor-v2.repository';
import {
  TRACKING_EVENT_REPOSITORY,
  TrackingEventRepository,
  VisitorEventStats,
} from '../../../../tracking-v2/domain/tracking-event.repository';
import {
  CHAT_V2_REPOSITORY,
  IChatRepository,
} from '../../../../conversations-v2/domain/chat.repository';
import {
  LEAD_SCORING_SERVICE,
  LeadScoringService,
} from '../../../../lead-scoring/domain/lead-scoring.service';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { ok, err } from '../../../../shared/domain/result';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';
import { VisitorLifecycle } from '../../../domain/value-objects/visitor-lifecycle';
import { ConnectionStatus } from '../../../domain/value-objects/visitor-connection';

// Error simple para tests
class TestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

describe('GetVisitorActivityQueryHandler', () => {
  let handler: GetVisitorActivityQueryHandler;
  let mockVisitorRepository: jest.Mocked<VisitorV2Repository>;
  let mockTrackingRepository: jest.Mocked<TrackingEventRepository>;
  let mockChatRepository: jest.Mocked<IChatRepository>;
  let mockLeadScoringService: jest.Mocked<LeadScoringService>;

  const visitorId = Uuid.random().value;
  const tenantId = Uuid.random().value;
  const siteId = Uuid.random().value;

  beforeEach(async () => {
    mockVisitorRepository = {
      findById: jest.fn(),
    } as any;

    mockTrackingRepository = {
      getStatsByVisitor: jest.fn(),
    } as any;

    mockChatRepository = {
      findByVisitorId: jest.fn(),
    } as any;

    mockLeadScoringService = {
      calculateScore: jest.fn().mockReturnValue({
        toPrimitives: () => ({
          score: 0,
          tier: 'cold',
          signals: {
            isRecurrentVisitor: false,
            hasHighEngagement: false,
            hasInvestedTime: false,
            needsHelp: false,
          },
        }),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorActivityQueryHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockVisitorRepository,
        },
        {
          provide: TRACKING_EVENT_REPOSITORY,
          useValue: mockTrackingRepository,
        },
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: LEAD_SCORING_SERVICE,
          useValue: mockLeadScoringService,
        },
      ],
    }).compile();

    handler = module.get<GetVisitorActivityQueryHandler>(
      GetVisitorActivityQueryHandler,
    );
  });

  describe('execute', () => {
    it('debe retornar estadísticas de actividad del visitante', async () => {
      // Arrange
      const sessionStartedAt = new Date(Date.now() - 3600000); // 1 hora atrás
      const lastActivityAt = new Date(Date.now() - 60000); // 1 minuto atrás

      const mockVisitor = VisitorV2.fromPrimitives({
        id: visitorId,
        fingerprint: 'fp_test_visitor',
        tenantId,
        siteId,
        lifecycle: VisitorLifecycle.ENGAGED,
        connectionStatus: ConnectionStatus.ONLINE,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
        consentVersion: 'v1.0',
        currentUrl: 'https://example.com/products',
        sessions: [
          {
            id: Uuid.random().value,
            startedAt: sessionStartedAt.toISOString(),
            lastActivityAt: lastActivityAt.toISOString(),
          },
          {
            id: Uuid.random().value,
            startedAt: new Date(Date.now() - 86400000).toISOString(), // Sesión anterior de 1 día atrás
            lastActivityAt: new Date(Date.now() - 82800000).toISOString(),
            endedAt: new Date(Date.now() - 82800000).toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));

      const mockTrackingStats: VisitorEventStats = {
        visitorId,
        totalEvents: 25,
        eventsByType: {
          PAGE_VIEW: 15,
          CLICK: 8,
          SCROLL: 2,
        },
        sessionsCount: 2,
        firstEventAt: new Date(Date.now() - 86400000),
        lastEventAt: new Date(),
      };
      mockTrackingRepository.getStatsByVisitor.mockResolvedValue(
        ok(mockTrackingStats),
      );

      mockChatRepository.findByVisitorId.mockResolvedValue(
        ok([
          { id: { getValue: () => 'chat1' } },
          { id: { getValue: () => 'chat2' } },
          { id: { getValue: () => 'chat3' } },
        ] as any),
      );

      // Act
      const result = await handler.execute(new GetVisitorActivityQuery(visitorId));

      // Assert
      expect(result.visitorId).toBe(visitorId);
      expect(result.totalSessions).toBe(2);
      expect(result.totalChats).toBe(3);
      expect(result.totalPagesVisited).toBe(15);
      expect(result.totalTimeConnectedMs).toBeGreaterThan(0);
      expect(result.currentConnectionStatus).toBe(ConnectionStatus.ONLINE);
      expect(result.lifecycle).toBe(VisitorLifecycle.ENGAGED);
      expect(result.currentUrl).toBe('https://example.com/products');
      expect(result.lastActivityAt).toBeDefined();
    });

    it('debe lanzar NotFoundException cuando el visitante no existe', async () => {
      // Arrange
      const nonExistentId = Uuid.random().value;
      mockVisitorRepository.findById.mockResolvedValue(
        err(new TestError('NOT_FOUND', 'Visitante no encontrado') as any),
      );

      // Act & Assert
      await expect(
        handler.execute(new GetVisitorActivityQuery(nonExistentId)),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe retornar totalPagesVisited 0 cuando no hay estadísticas de tracking', async () => {
      // Arrange
      const mockVisitor = VisitorV2.fromPrimitives({
        id: visitorId,
        fingerprint: 'fp_test_visitor',
        tenantId,
        siteId,
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
        consentVersion: 'v1.0',
        sessions: [
          {
            id: Uuid.random().value,
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));
      mockTrackingRepository.getStatsByVisitor.mockResolvedValue(
        err(new TestError('NOT_FOUND', 'No stats found') as any),
      );
      mockChatRepository.findByVisitorId.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(new GetVisitorActivityQuery(visitorId));

      // Assert
      expect(result.totalPagesVisited).toBe(0);
      expect(result.totalChats).toBe(0);
    });

    it('debe retornar totalChats 0 cuando no hay chats', async () => {
      // Arrange
      const mockVisitor = VisitorV2.fromPrimitives({
        id: visitorId,
        fingerprint: 'fp_test_visitor',
        tenantId,
        siteId,
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
        consentVersion: 'v1.0',
        sessions: [
          {
            id: Uuid.random().value,
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));
      mockTrackingRepository.getStatsByVisitor.mockResolvedValue(
        ok({
          visitorId,
          totalEvents: 5,
          eventsByType: { PAGE_VIEW: 5 },
          sessionsCount: 1,
          firstEventAt: new Date(),
          lastEventAt: new Date(),
        }),
      );
      mockChatRepository.findByVisitorId.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(new GetVisitorActivityQuery(visitorId));

      // Assert
      expect(result.totalChats).toBe(0);
      expect(result.totalPagesVisited).toBe(5);
    });

    it('debe calcular correctamente el tiempo total conectado de múltiples sesiones', async () => {
      // Arrange
      const now = Date.now();
      const session1Start = new Date(now - 7200000); // 2 horas atrás
      const session1End = new Date(now - 3600000); // 1 hora atrás (duración: 1 hora)
      const session2Start = new Date(now - 1800000); // 30 min atrás
      const session2Activity = new Date(now - 600000); // 10 min atrás

      const mockVisitor = VisitorV2.fromPrimitives({
        id: visitorId,
        fingerprint: 'fp_test_visitor',
        tenantId,
        siteId,
        lifecycle: VisitorLifecycle.LEAD,
        hasAcceptedPrivacyPolicy: true,
        privacyPolicyAcceptedAt: new Date().toISOString(),
        consentVersion: 'v1.0',
        sessions: [
          {
            id: Uuid.random().value,
            startedAt: session1Start.toISOString(),
            lastActivityAt: session1End.toISOString(),
            endedAt: session1End.toISOString(),
          },
          {
            id: Uuid.random().value,
            startedAt: session2Start.toISOString(),
            lastActivityAt: session2Activity.toISOString(),
            // Sin endedAt (sesión activa)
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));
      mockTrackingRepository.getStatsByVisitor.mockResolvedValue(
        ok({
          visitorId,
          totalEvents: 10,
          eventsByType: { PAGE_VIEW: 10 },
          sessionsCount: 2,
          firstEventAt: session1Start,
          lastEventAt: session2Activity,
        }),
      );
      mockChatRepository.findByVisitorId.mockResolvedValue(ok([]));

      // Act
      const result = await handler.execute(new GetVisitorActivityQuery(visitorId));

      // Assert
      expect(result.totalSessions).toBe(2);
      // Duración total debe ser aproximadamente 1 hora + tiempo desde session2Start hasta ahora
      expect(result.totalTimeConnectedMs).toBeGreaterThan(3600000); // Al menos 1 hora
    });
  });
});
