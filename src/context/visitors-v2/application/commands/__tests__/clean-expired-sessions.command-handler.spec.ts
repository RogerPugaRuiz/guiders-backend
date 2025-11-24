import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CleanExpiredSessionsCommandHandler } from '../clean-expired-sessions.command-handler';
import { CleanExpiredSessionsCommand } from '../clean-expired-sessions.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../../domain/visitor-v2.repository';
import {
  SessionManagementDomainService,
  SESSION_MANAGEMENT_DOMAIN_SERVICE,
} from '../../../domain/session-management.domain-service';
import {
  VisitorConnectionDomainService,
  VISITOR_CONNECTION_DOMAIN_SERVICE,
} from '../../../domain/visitor-connection.domain-service';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { SessionId } from '../../../domain/value-objects/session-id';
import { VisitorLifecycle } from '../../../domain/value-objects/visitor-lifecycle';
import {
  VisitorConnectionVO,
  ConnectionStatus,
} from '../../../domain/value-objects/visitor-connection';
import { ok, okVoid } from '../../../../shared/domain/result';

interface VisitorWithCommit extends VisitorV2 {
  commit: () => void;
}

describe('CleanExpiredSessionsCommandHandler', () => {
  let handler: CleanExpiredSessionsCommandHandler;
  let visitorRepository: jest.Mocked<VisitorV2Repository>;
  let sessionManagementService: jest.Mocked<SessionManagementDomainService>;
  let connectionService: jest.Mocked<VisitorConnectionDomainService>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanExpiredSessionsCommandHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: {
            findWithActiveSessions: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: SESSION_MANAGEMENT_DOMAIN_SERVICE,
          useValue: {
            hasExpiredSessions: jest.fn(),
            cleanExpiredSessions: jest.fn(),
            determineTimeoutForVisitor: jest.fn(),
            shouldBeMarkedAsInactive: jest.fn(),
          },
        },
        {
          provide: VISITOR_CONNECTION_DOMAIN_SERVICE,
          useValue: {
            getConnectionStatus: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            mergeObjectContext: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CleanExpiredSessionsCommandHandler>(
      CleanExpiredSessionsCommandHandler,
    );
    visitorRepository = module.get(VISITOR_V2_REPOSITORY);
    sessionManagementService = module.get(SESSION_MANAGEMENT_DOMAIN_SERVICE);
    connectionService = module.get(VISITOR_CONNECTION_DOMAIN_SERVICE);
    eventPublisher = module.get(EventPublisher);
  });

  describe('execute', () => {
    it('debe limpiar sesiones expiradas de visitantes y publicar eventos', async () => {
      // Crear visitantes de prueba con sesiones expiradas
      const visitor1 = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test1',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        ],
      });

      const visitor2 = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test2',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          },
        ],
      });

      const visitors = [visitor1, visitor2];

      // Mock repository
      visitorRepository.findWithActiveSessions.mockResolvedValue(ok(visitors));
      visitorRepository.save.mockResolvedValue(okVoid());

      // Mock session service
      sessionManagementService.hasExpiredSessions.mockReturnValue(true);
      sessionManagementService.cleanExpiredSessions
        .mockReturnValueOnce(visitor1)
        .mockReturnValueOnce(visitor2);

      // Mock connection service - visitantes offline
      const offlineStatus = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
      connectionService.getConnectionStatus.mockResolvedValue(offlineStatus);

      // Mock event publisher
      const mockCommit = jest.fn();
      eventPublisher.mergeObjectContext.mockImplementation((visitor) => {
        const merged = visitor as VisitorWithCommit;
        merged.commit = mockCommit;
        return merged;
      });

      // Ejecutar comando
      const command = new CleanExpiredSessionsCommand(undefined, 100);
      const result = await handler.execute(command);

      // Verificaciones
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap()).toEqual({ cleanedCount: 2 });
      }

      // Verificar que se buscaron visitantes con sesiones activas
      expect(visitorRepository.findWithActiveSessions).toHaveBeenCalledWith({
        limit: 100,
        tenantId: undefined,
      });

      // Verificar que se verificó si tienen sesiones expiradas
      expect(sessionManagementService.hasExpiredSessions).toHaveBeenCalledTimes(
        2,
      );

      // Verificar que se limpiaron las sesiones
      expect(
        sessionManagementService.cleanExpiredSessions,
      ).toHaveBeenCalledTimes(2);

      // Verificar que se guardaron los visitantes
      expect(visitorRepository.save).toHaveBeenCalledTimes(2);

      // Verificar que se publicaron eventos
      expect(mockCommit).toHaveBeenCalledTimes(2);
    });

    it('debe filtrar por tenantId si se proporciona', async () => {
      const tenantId = TenantId.random();
      visitorRepository.findWithActiveSessions.mockResolvedValue(ok([]));

      const command = new CleanExpiredSessionsCommand(tenantId, 50);
      await handler.execute(command);

      expect(visitorRepository.findWithActiveSessions).toHaveBeenCalledWith({
        limit: 50,
        tenantId: tenantId,
      });
    });

    it('no debe procesar visitantes sin sesiones expiradas', async () => {
      const visitor = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          },
        ],
      });

      visitorRepository.findWithActiveSessions.mockResolvedValue(ok([visitor]));
      sessionManagementService.hasExpiredSessions.mockReturnValue(false);

      const command = new CleanExpiredSessionsCommand(undefined, 100);
      const result = await handler.execute(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap()).toEqual({ cleanedCount: 0 });
      }

      // No debe intentar guardar si no hay sesiones expiradas
      expect(visitorRepository.save).not.toHaveBeenCalled();
      expect(
        sessionManagementService.cleanExpiredSessions,
      ).not.toHaveBeenCalled();
    });

    it('debe continuar procesando si falla guardar un visitante', async () => {
      const visitor1 = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test1',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        ],
      });

      const visitor2 = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_test2',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          },
        ],
      });

      visitorRepository.findWithActiveSessions.mockResolvedValue(
        ok([visitor1, visitor2]),
      );
      sessionManagementService.hasExpiredSessions.mockReturnValue(true);
      sessionManagementService.cleanExpiredSessions
        .mockReturnValueOnce(visitor1)
        .mockReturnValueOnce(visitor2);

      // Mock connection service - visitantes offline
      const offlineStatus = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
      connectionService.getConnectionStatus.mockResolvedValue(offlineStatus);

      // Primer guardado falla, segundo éxito
      visitorRepository.save
        .mockResolvedValueOnce({
          isOk: () => false,
          isErr: () => true,
          error: { message: 'Error de prueba' },
        } as any)
        .mockResolvedValueOnce(okVoid());

      const mockCommit = jest.fn();
      eventPublisher.mergeObjectContext.mockImplementation((visitor) => {
        const merged = visitor as VisitorWithCommit;
        merged.commit = mockCommit;
        return merged;
      });

      const command = new CleanExpiredSessionsCommand(undefined, 100);
      const result = await handler.execute(command);

      // Debe procesarse 1 visitante exitosamente
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap()).toEqual({ cleanedCount: 1 });
      }

      // Se intentó guardar ambos
      expect(visitorRepository.save).toHaveBeenCalledTimes(2);

      // Solo se hizo commit del exitoso
      expect(mockCommit).toHaveBeenCalledTimes(1);
    });

    it('debe usar batch size por defecto si no se proporciona', async () => {
      visitorRepository.findWithActiveSessions.mockResolvedValue(ok([]));

      const command = new CleanExpiredSessionsCommand(undefined, undefined);
      await handler.execute(command);

      expect(visitorRepository.findWithActiveSessions).toHaveBeenCalledWith({
        limit: 100, // default
        tenantId: undefined,
      });
    });

    it('no debe cerrar sesiones de visitantes con WebSocket conectado', async () => {
      const visitorOnline = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_online',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        ],
      });

      const visitorOffline = VisitorV2.fromPrimitives({
        id: VisitorId.random().getValue(),
        tenantId: TenantId.random().getValue(),
        siteId: SiteId.random().getValue(),
        fingerprint: 'fp_offline',
        lifecycle: VisitorLifecycle.ANON,
        hasAcceptedPrivacyPolicy: false,
        privacyPolicyAcceptedAt: null,
        consentVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessions: [
          {
            id: SessionId.random().getValue(),
            startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            lastActivityAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          },
        ],
      });

      visitorRepository.findWithActiveSessions.mockResolvedValue(
        ok([visitorOnline, visitorOffline]),
      );
      visitorRepository.save.mockResolvedValue(okVoid());
      sessionManagementService.hasExpiredSessions.mockReturnValue(true);
      sessionManagementService.cleanExpiredSessions.mockReturnValue(visitorOffline);

      // Mock connection service - primer visitante online, segundo offline
      const onlineStatus = new VisitorConnectionVO(ConnectionStatus.ONLINE);
      const offlineStatus = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
      connectionService.getConnectionStatus
        .mockResolvedValueOnce(onlineStatus)
        .mockResolvedValueOnce(offlineStatus);

      const mockCommit = jest.fn();
      eventPublisher.mergeObjectContext.mockImplementation((visitor) => {
        const merged = visitor as VisitorWithCommit;
        merged.commit = mockCommit;
        return merged;
      });

      const command = new CleanExpiredSessionsCommand(undefined, 100);
      const result = await handler.execute(command);

      // Solo debe limpiar 1 (el offline)
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.unwrap()).toEqual({ cleanedCount: 1 });
      }

      // Se verificó estado de conexión para ambos
      expect(connectionService.getConnectionStatus).toHaveBeenCalledTimes(2);

      // Solo se limpió el visitante offline
      expect(sessionManagementService.cleanExpiredSessions).toHaveBeenCalledTimes(1);
      expect(visitorRepository.save).toHaveBeenCalledTimes(1);
      expect(mockCommit).toHaveBeenCalledTimes(1);
    });
  });
});
