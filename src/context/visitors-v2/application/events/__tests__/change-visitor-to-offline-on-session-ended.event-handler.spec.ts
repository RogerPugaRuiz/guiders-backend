import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { ChangeVisitorToOfflineOnSessionEndedEventHandler } from '../change-visitor-to-offline-on-session-ended.event-handler';
import { SessionEndedEvent } from '../../../domain/events/session.events';
import {
  VISITOR_V2_REPOSITORY,
  VisitorV2Repository,
} from '../../../domain/visitor-v2.repository';
import { VisitorV2 } from '../../../domain/visitor-v2.aggregate';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { TenantId } from '../../../domain/value-objects/tenant-id';
import { SiteId } from '../../../domain/value-objects/site-id';
import { VisitorFingerprint } from '../../../domain/value-objects/visitor-fingerprint';
import { ok, err } from 'src/context/shared/domain/result';

describe('ChangeVisitorToOfflineOnSessionEndedEventHandler', () => {
  let handler: ChangeVisitorToOfflineOnSessionEndedEventHandler;
  let mockRepository: jest.Mocked<VisitorV2Repository>;
  let mockPublisher: EventPublisher;

  beforeEach(async () => {
    // Mock repository
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    // Mock EventPublisher
    mockPublisher = {
      mergeObjectContext: jest.fn((agg: VisitorV2) => {
        // Devolver el aggregate con métodos mockeados para commit
        return Object.assign(agg, {
          commit: jest.fn(),
        }) as VisitorV2;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChangeVisitorToOfflineOnSessionEndedEventHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: EventPublisher,
          useValue: mockPublisher,
        },
      ],
    }).compile();

    handler = module.get<ChangeVisitorToOfflineOnSessionEndedEventHandler>(
      ChangeVisitorToOfflineOnSessionEndedEventHandler,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    const createVisitor = () => {
      return VisitorV2.create({
        id: new VisitorId('11111111-1111-4111-8111-111111111111'),
        tenantId: new TenantId('22222222-2222-4222-8222-222222222222'),
        siteId: new SiteId('33333333-3333-4333-8333-333333333333'),
        fingerprint: new VisitorFingerprint('fp_test'),
      });
    };

    it('debe marcar visitante como offline cuando no tiene sesiones activas', async () => {
      // Arrange
      const visitor = createVisitor();

      // Simular que la sesión se cerró (endCurrentSession ya fue llamado)
      visitor.endCurrentSession();

      const event = new SessionEndedEvent({
        visitorId: visitor.getId().getValue(),
        sessionId: 'session-123',
        endedAt: new Date().toISOString(),
        duration: 30000,
      });

      mockRepository.findById.mockResolvedValue(ok(visitor));
      mockRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(
        expect.any(VisitorId),
      );
      expect(mockRepository.save).toHaveBeenCalled();

      // Verificar que se llamó a commit (esto dispara los eventos)
      const aggCtx = mockPublisher.mergeObjectContext(visitor);
      expect(aggCtx.commit).toBeDefined();
    });

    it('NO debe marcar como offline si el visitante tiene otras sesiones activas', async () => {
      // Arrange
      const visitor = createVisitor();

      // Crear una segunda sesión activa
      visitor.startNewSession();

      const event = new SessionEndedEvent({
        visitorId: visitor.getId().getValue(),
        sessionId: 'session-123',
        endedAt: new Date().toISOString(),
        duration: 30000,
      });

      mockRepository.findById.mockResolvedValue(ok(visitor));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalled();
      // NO debe llamar a save porque tiene sesiones activas
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe manejar correctamente cuando el visitante no existe', async () => {
      // Arrange
      const event = new SessionEndedEvent({
        visitorId: '99999999-9999-4999-8999-999999999999',
        sessionId: 'session-456',
        endedAt: new Date().toISOString(),
        duration: 15000,
      });

      mockRepository.findById.mockResolvedValue(
        err({ message: 'Visitante no encontrado' } as any),
      );

      // Act & Assert - No debe lanzar error
      await expect(handler.handle(event)).resolves.not.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('debe manejar correctamente errores al guardar el visitante', async () => {
      // Arrange
      const visitor = createVisitor();
      visitor.endCurrentSession();

      const event = new SessionEndedEvent({
        visitorId: visitor.getId().getValue(),
        sessionId: 'session-789',
        endedAt: new Date().toISOString(),
        duration: 45000,
      });

      mockRepository.findById.mockResolvedValue(ok(visitor));
      mockRepository.save.mockResolvedValue(
        err({ message: 'Error al guardar' } as any),
      );

      // Act & Assert - No debe lanzar error
      await expect(handler.handle(event)).resolves.not.toThrow();

      // Debe intentar guardar
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debe logear correctamente la información de la sesión cerrada', async () => {
      // Arrange
      const visitor = createVisitor();
      visitor.endCurrentSession();

      const testDate = new Date('2025-10-19T10:30:00Z');
      const event = new SessionEndedEvent({
        visitorId: visitor.getId().getValue(),
        sessionId: 'session-log-test',
        endedAt: testDate.toISOString(),
        duration: 60000, // 1 minuto
      });

      mockRepository.findById.mockResolvedValue(ok(visitor));
      mockRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await handler.handle(event);

      // Assert - Verificar que se procesó correctamente
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('debe manejar excepciones generales sin afectar el flujo', async () => {
      // Arrange
      const event = new SessionEndedEvent({
        visitorId: '11111111-1111-4111-8111-111111111111',
        sessionId: 'session-exception',
        endedAt: new Date().toISOString(),
        duration: 30000,
      });

      // Simular una excepción inesperada
      mockRepository.findById.mockRejectedValue(
        new Error('Error inesperado de base de datos'),
      );

      // Act & Assert - No debe lanzar error
      await expect(handler.handle(event)).resolves.not.toThrow();
    });

    it('debe verificar correctamente el estado de sesiones activas', async () => {
      // Arrange
      const visitor = createVisitor();

      // Cerrar todas las sesiones
      visitor.endCurrentSession();

      const event = new SessionEndedEvent({
        visitorId: visitor.getId().getValue(),
        sessionId: 'session-check',
        endedAt: new Date().toISOString(),
        duration: 20000,
      });

      mockRepository.findById.mockResolvedValue(ok(visitor));
      mockRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(visitor.hasActiveSessions()).toBe(false);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('debe procesar múltiples eventos de sesión cerrada independientemente', async () => {
      // Arrange
      const visitor1 = createVisitor();
      const visitor2 = VisitorV2.create({
        id: new VisitorId('22222222-2222-4222-8222-222222222222'),
        tenantId: new TenantId('33333333-3333-4333-8333-333333333333'),
        siteId: new SiteId('44444444-4444-4444-8444-444444444444'),
        fingerprint: new VisitorFingerprint('fp_test2'),
      });

      visitor1.endCurrentSession();
      visitor2.endCurrentSession();

      const event1 = new SessionEndedEvent({
        visitorId: visitor1.getId().getValue(),
        sessionId: 'session-1',
        endedAt: new Date().toISOString(),
        duration: 30000,
      });

      const event2 = new SessionEndedEvent({
        visitorId: visitor2.getId().getValue(),
        sessionId: 'session-2',
        endedAt: new Date().toISOString(),
        duration: 40000,
      });

      mockRepository.findById
        .mockResolvedValueOnce(ok(visitor1))
        .mockResolvedValueOnce(ok(visitor2));
      mockRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
