import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher, EventBus } from '@nestjs/cqrs';
import { UpdateSessionHeartbeatCommandHandler } from '../update-session-heartbeat.command-handler';
import { UpdateSessionHeartbeatCommand } from '../update-session-heartbeat.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../../domain/visitor-v2.repository';
import {
  VisitorConnectionDomainService,
  VISITOR_CONNECTION_DOMAIN_SERVICE,
} from '../../../domain/visitor-connection.domain-service';
import { LEAD_SCORING_SERVICE } from '../../../../lead-scoring/domain/lead-scoring.service';
import { TRACKING_EVENT_REPOSITORY } from '../../../../tracking-v2/domain/tracking-event.repository';
import { CHAT_V2_REPOSITORY } from '../../../../conversations-v2/domain/chat.repository';
import { ok } from '../../../../shared/domain/result';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../../domain/value-objects/visitor-fingerprint';
import { SessionId } from '../../../domain/value-objects/session-id';
import {
  ConnectionStatus,
  VisitorConnectionVO,
} from '../../../domain/value-objects/visitor-connection';
import { VisitorLastActivity } from '../../../domain/value-objects/visitor-last-activity';
import { ActivityType } from '../../dtos/update-session-heartbeat.dto';

describe('UpdateSessionHeartbeatCommandHandler', () => {
  let handler: UpdateSessionHeartbeatCommandHandler;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let connectionService: jest.Mocked<VisitorConnectionDomainService>;
  let eventPublisher: EventPublisher;

  // Mock de visitante de prueba
  let mockVisitor: VisitorV2;
  let mockVisitorContext: any;

  beforeEach(async () => {
    // Crear mocks
    const mockRepositoryValue = {
      findBySessionId: jest.fn(),
      save: jest.fn(),
    };

    const mockConnectionServiceValue = {
      updateLastActivity: jest.fn(),
      updateLastUserActivity: jest.fn(),
      getLastActivity: jest.fn(),
      getLastUserActivity: jest.fn(),
      isVisitorActive: jest.fn(),
      isUserActive: jest.fn(),
      getConnectionStatus: jest.fn(),
      setConnectionStatus: jest.fn(),
    };

    const mockEventPublisherValue = {
      mergeObjectContext: jest.fn(),
    };

    const mockLeadScoringServiceValue = {
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
    };

    const mockTrackingRepositoryValue = {
      getStatsByVisitor: jest.fn(),
    };

    const mockChatRepositoryValue = {
      findByVisitorId: jest.fn(),
    };

    const mockEventBusValue = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSessionHeartbeatCommandHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockRepositoryValue,
        },
        {
          provide: VISITOR_CONNECTION_DOMAIN_SERVICE,
          useValue: mockConnectionServiceValue,
        },
        {
          provide: LEAD_SCORING_SERVICE,
          useValue: mockLeadScoringServiceValue,
        },
        {
          provide: TRACKING_EVENT_REPOSITORY,
          useValue: mockTrackingRepositoryValue,
        },
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepositoryValue,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisherValue,
        },
        {
          provide: EventBus,
          useValue: mockEventBusValue,
        },
      ],
    }).compile();

    handler = module.get<UpdateSessionHeartbeatCommandHandler>(
      UpdateSessionHeartbeatCommandHandler,
    );
    visitorRepository = module.get(VISITOR_V2_REPOSITORY);
    connectionService = module.get(VISITOR_CONNECTION_DOMAIN_SERVICE);
    eventPublisher = module.get(EventPublisher);

    // Crear visitante de prueba
    mockVisitor = VisitorV2.create({
      id: VisitorId.random(),
      tenantId: TenantId.random(),
      siteId: SiteId.random(),
      fingerprint: new VisitorFingerprint('test_fingerprint_123'),
    });

    // Mock del contexto con commit
    mockVisitorContext = {
      ...mockVisitor,
      commit: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const sessionId = SessionId.random().value;

    beforeEach(() => {
      // Setup por defecto
      visitorRepository.findBySessionId.mockResolvedValue(ok(mockVisitor));
      visitorRepository.save.mockResolvedValue(ok(undefined));
      connectionService.updateLastActivity.mockResolvedValue(undefined);
      connectionService.updateLastUserActivity.mockResolvedValue(undefined);
      (eventPublisher.mergeObjectContext as jest.Mock).mockReturnValue(
        mockVisitorContext,
      );
    });

    describe('Heartbeat automático (activityType: heartbeat o undefined)', () => {
      it('debe actualizar timestamp pero NO reactivar desde AWAY cuando activityType es heartbeat', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.HEARTBEAT,
        );
        const awayStatus = new VisitorConnectionVO(ConnectionStatus.AWAY);
        connectionService.getConnectionStatus.mockResolvedValue(awayStatus);

        const returnFromAwaySpy = jest.spyOn(mockVisitor, 'returnFromAway');

        // Act
        await handler.execute(command);

        // Assert
        expect(connectionService.updateLastActivity).toHaveBeenCalledWith(
          mockVisitor.getId(),
          expect.any(VisitorLastActivity),
        );
        expect(connectionService.getConnectionStatus).not.toHaveBeenCalled(); // No verifica estado
        expect(returnFromAwaySpy).not.toHaveBeenCalled(); // No reactiva
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
        expect(mockVisitorContext.commit).toHaveBeenCalled();
      });

      it('debe actualizar timestamp pero NO reactivar desde OFFLINE cuando activityType es heartbeat', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.HEARTBEAT,
        );
        const offlineStatus = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
        connectionService.getConnectionStatus.mockResolvedValue(offlineStatus);

        const goOnlineSpy = jest.spyOn(mockVisitor, 'goOnline');

        // Act
        await handler.execute(command);

        // Assert
        expect(connectionService.updateLastActivity).toHaveBeenCalled();
        expect(connectionService.getConnectionStatus).not.toHaveBeenCalled();
        expect(goOnlineSpy).not.toHaveBeenCalled(); // No reactiva
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
      });

      it('debe actualizar timestamp pero NO reactivar cuando activityType es undefined (backwards compatible)', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          undefined, // Sin activityType
        );
        const awayStatus = new VisitorConnectionVO(ConnectionStatus.AWAY);
        connectionService.getConnectionStatus.mockResolvedValue(awayStatus);

        const returnFromAwaySpy = jest.spyOn(mockVisitor, 'returnFromAway');

        // Act
        await handler.execute(command);

        // Assert
        expect(connectionService.updateLastActivity).toHaveBeenCalled();
        expect(connectionService.getConnectionStatus).not.toHaveBeenCalled();
        expect(returnFromAwaySpy).not.toHaveBeenCalled();
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
      });
    });

    describe('Interacción del usuario (activityType: user-interaction)', () => {
      it('debe reactivar el visitante a ONLINE cuando está en AWAY con user-interaction', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.USER_INTERACTION,
        );
        const awayStatus = new VisitorConnectionVO(ConnectionStatus.AWAY);
        connectionService.getConnectionStatus.mockResolvedValue(awayStatus);

        const returnFromAwaySpy = jest.spyOn(mockVisitor, 'returnFromAway');

        // Act
        await handler.execute(command);

        // Assert
        expect(connectionService.getConnectionStatus).toHaveBeenCalledWith(
          mockVisitor.getId(),
        );
        expect(returnFromAwaySpy).toHaveBeenCalled();
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
        expect(mockVisitorContext.commit).toHaveBeenCalled();
      });

      it('debe reactivar el visitante a ONLINE cuando está OFFLINE con user-interaction', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.USER_INTERACTION,
        );
        const offlineStatus = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
        connectionService.getConnectionStatus.mockResolvedValue(offlineStatus);

        const goOnlineSpy = jest.spyOn(mockVisitor, 'goOnline');

        // Act
        await handler.execute(command);

        // Assert
        expect(connectionService.getConnectionStatus).toHaveBeenCalledWith(
          mockVisitor.getId(),
        );
        expect(goOnlineSpy).toHaveBeenCalled();
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
        expect(mockVisitorContext.commit).toHaveBeenCalled();
      });

      it('debe NO llamar a returnFromAway cuando el visitante está CHATTING con user-interaction', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.USER_INTERACTION,
        );
        const chattingStatus = new VisitorConnectionVO(
          ConnectionStatus.CHATTING,
        );
        connectionService.getConnectionStatus.mockResolvedValue(chattingStatus);

        const returnFromAwaySpy = jest.spyOn(mockVisitor, 'returnFromAway');
        const goOnlineSpy = jest.spyOn(mockVisitor, 'goOnline');

        // Act
        await handler.execute(command);

        // Assert
        expect(returnFromAwaySpy).not.toHaveBeenCalled();
        expect(goOnlineSpy).not.toHaveBeenCalled();
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
      });

      it('debe continuar sin error cuando no se encuentra el estado en Redis con user-interaction', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.USER_INTERACTION,
        );
        connectionService.getConnectionStatus.mockRejectedValue(
          new Error('Estado no encontrado'),
        );

        // Act & Assert - no debe lanzar error
        await expect(handler.execute(command)).resolves.not.toThrow();

        expect(connectionService.updateLastActivity).toHaveBeenCalled();
        expect(visitorRepository.save).toHaveBeenCalledWith(mockVisitorContext);
        expect(mockVisitorContext.commit).toHaveBeenCalled();
      });
    });

    describe('Validaciones y errores', () => {
      it('debe lanzar error cuando no se encuentra la sesión', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(sessionId);
        visitorRepository.findBySessionId.mockResolvedValue(
          ok(null) as any, // Simula que no encuentra el visitante
        );

        // Act & Assert
        await expect(handler.execute(command)).rejects.toThrow();
      });

      it('debe validar el visitorId cuando se proporciona', async () => {
        // Arrange
        const differentVisitorId = VisitorId.random().value;
        const commandWithVisitorId = new UpdateSessionHeartbeatCommand(
          sessionId,
          differentVisitorId,
        );

        // Act & Assert
        await expect(handler.execute(commandWithVisitorId)).rejects.toThrow(
          'Sesión no válida para este visitante',
        );
      });
    });

    describe('Orden de ejecución', () => {
      it('debe actualizar lastActivity antes de verificar el estado con user-interaction', async () => {
        // Arrange
        const command = new UpdateSessionHeartbeatCommand(
          sessionId,
          undefined,
          ActivityType.USER_INTERACTION,
        );
        const onlineStatus = new VisitorConnectionVO(ConnectionStatus.ONLINE);
        connectionService.getConnectionStatus.mockResolvedValue(onlineStatus);

        const callOrder: string[] = [];

        connectionService.updateLastActivity.mockImplementation(() => {
          callOrder.push('updateLastActivity');
          return Promise.resolve();
        });

        connectionService.updateLastUserActivity.mockImplementation(() => {
          callOrder.push('updateLastUserActivity');
          return Promise.resolve();
        });

        connectionService.getConnectionStatus.mockImplementation(() => {
          callOrder.push('getConnectionStatus');
          return Promise.resolve(onlineStatus);
        });

        // Act
        await handler.execute(command);

        // Assert - verificar orden correcto: updateLastActivity → updateLastUserActivity → getConnectionStatus
        expect(callOrder).toEqual([
          'updateLastActivity',
          'updateLastUserActivity',
          'getConnectionStatus',
        ]);
      });
    });
  });
});
