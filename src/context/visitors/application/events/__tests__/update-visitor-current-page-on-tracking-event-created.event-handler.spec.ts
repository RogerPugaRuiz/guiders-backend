import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler } from '../update-visitor-current-page-on-tracking-event-created.event-handler';
import { TrackingEventCreatedEvent } from 'src/context/tracking/domain/events/tracking-event-created-event';
import { UpdateVisitorCurrentPageCommand } from '../../commands/update-visitor-current-page.command';

describe('UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler', () => {
  let handler: UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    // Creamos un mock del CommandBus
    mockCommandBus = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler =
      module.get<UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler>(
        UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateVisitorCurrentPageCommand when event type is page_view and has page with url in metadata', async () => {
      // Arrange
      const visitorId = 'visitor-123';
      const metadata = {
        page: {
          url: 'http://localhost:8080/vehicle-search',
          path: '/vehicle-search',
          search: '?q=honda',
          host: 'localhost:8080',
          protocol: 'http:',
          hash: '',
          referrer: 'http://localhost:8080/vehicle-comparison',
          timestamp: 1750851251584,
        },
        session: {
          sessionId: '34eed1e7-f078-4ddd-bcd9-1ed9de5c097f',
          startTime: 1750656609125,
          lastActiveTime: 1750851251079,
          totalActiveTime: 2423033,
          isActive: true,
          isIdle: false,
        },
        device: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'MacIntel',
          language: 'es-ES',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-123',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorCurrentPageCommand(
          visitorId,
          'http://localhost:8080/vehicle-search',
        ),
      );
    });

    it('should execute UpdateVisitorCurrentPageCommand with url when available (highest priority)', async () => {
      // Arrange
      const visitorId = 'visitor-456';
      const metadata = {
        page: {
          url: 'http://localhost:8080/vehicle-comparison',
          path: '/vehicle-comparison',
          host: 'localhost:8080',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-456',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorCurrentPageCommand(
          visitorId,
          'http://localhost:8080/vehicle-comparison',
        ),
      );
    });

    it('should execute UpdateVisitorCurrentPageCommand with path when url is not available', async () => {
      // Arrange
      const visitorId = 'visitor-789';
      const metadata = {
        page: {
          path: '/about-us',
          host: 'localhost:8080',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-789',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorCurrentPageCommand(visitorId, '/about-us'),
      );
    });

    it('should not execute command when event type is not page_view', async () => {
      // Arrange
      const visitorId = 'visitor-111';
      const metadata = {
        page: {
          url: 'http://localhost:8080/some-page',
        },
        action: 'click',
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-111',
        visitorId,
        eventType: 'button_click',
        metadata,
        occurredAt: new Date(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not execute command when page_view event has no page object in metadata', async () => {
      // Arrange
      const visitorId = 'visitor-222';
      const metadata = {
        action: 'view',
        timestamp: 1749630189102,
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-222',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not execute command when page object exists but has no url or path', async () => {
      // Arrange
      const visitorId = 'visitor-333';
      const metadata = {
        page: {
          host: 'localhost:8080',
          protocol: 'http:',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-333',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should log correct messages during successful execution', async () => {
      // Arrange
      const visitorId = 'visitor-444';
      const metadata = {
        page: {
          url: 'http://localhost:8080/contact',
          path: '/contact',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-444',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      const logSpy = jest.spyOn(handler['logger'], 'log');
      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        `Evento TrackingEventCreated recibido para visitante: ${visitorId} con tipo: page_view`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Actualizando página actual del visitante ${visitorId} a: http://localhost:8080/contact`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `Página actual del visitante ${visitorId} actualizada correctamente a: http://localhost:8080/contact`,
      );
    });

    it('should handle command bus errors gracefully and log error message', async () => {
      // Arrange
      const visitorId = 'visitor-error';
      const metadata = {
        page: {
          url: 'http://localhost:8080/error',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-error',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      const error = new Error('Command execution failed');
      const errorSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue(error);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        'Error al manejar evento TrackingEventCreated para actualizar página actual del visitante: Command execution failed',
      );
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const visitorId = 'visitor-unknown-error';
      const metadata = {
        page: {
          path: '/unknown-error',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-unknown-error',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      const errorSpy = jest.spyOn(handler['logger'], 'error');
      mockCommandBus.execute.mockRejectedValue('Unknown error');

      // Act
      await handler.handle(event);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Error al manejar evento TrackingEventCreated para actualizar página actual del visitante: Error desconocido',
      );
    });

    it('should work with different metadata formats and prioritize url over path', async () => {
      // Arrange
      const testCases = [
        {
          metadata: {
            page: {
              url: 'http://example.com/home',
              path: '/home',
            },
          },
          expected: 'http://example.com/home', // url tiene mayor prioridad
        },
        {
          metadata: {
            page: {
              path: '/about',
            },
          },
          expected: '/about', // solo path disponible
        },
        {
          metadata: {
            page: {
              url: 'http://example.com/services',
              path: '/services',
            },
          },
          expected: 'http://example.com/services', // url tiene mayor prioridad
        },
        {
          metadata: {
            page: {
              path: '/contact',
            },
          },
          expected: '/contact', // solo path disponible
        },
      ];

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act & Assert
      for (const testCase of testCases) {
        const event = new TrackingEventCreatedEvent({
          id: `tracking-event-${Math.random()}`,
          visitorId: 'visitor-test',
          eventType: 'page_view',
          metadata: testCase.metadata,
          occurredAt: new Date(),
        });

        await handler.handle(event);

        expect(mockCommandBus.execute).toHaveBeenCalledWith(
          new UpdateVisitorCurrentPageCommand(
            'visitor-test',
            testCase.expected,
          ),
        );
      }

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle empty strings and prioritize correctly', async () => {
      // Arrange
      const testCases = [
        {
          metadata: {
            page: {
              url: 'http://example.com/url',
              path: '',
            },
          },
          expected: 'http://example.com/url', // url tiene mayor prioridad
        },
        {
          metadata: {
            page: {
              url: '   ', // url vacío
              path: '/valid-path',
            },
          },
          expected: '/valid-path', // path como fallback
        },
        {
          metadata: {
            page: {
              url: null,
              path: '/valid-path',
            },
          },
          expected: '/valid-path', // path como fallback
        },
      ];

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act & Assert
      for (const testCase of testCases) {
        const event = new TrackingEventCreatedEvent({
          id: `tracking-event-${Math.random()}`,
          visitorId: 'visitor-test-empty',
          eventType: 'page_view',
          metadata: testCase.metadata,
          occurredAt: new Date(),
        });

        await handler.handle(event);

        expect(mockCommandBus.execute).toHaveBeenCalledWith(
          new UpdateVisitorCurrentPageCommand(
            'visitor-test-empty',
            testCase.expected,
          ),
        );
      }

      expect(mockCommandBus.execute).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle when page is not an object', async () => {
      // Arrange
      const visitorId = 'visitor-invalid-page';
      const metadata = {
        page: 'invalid-page-string', // page no es un objeto
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-invalid-page',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should handle user_resume event type correctly (should be ignored)', async () => {
      // Arrange
      const visitorId = 'visitor-user-resume';
      const metadata = {
        page: {
          url: 'http://localhost:8080/',
          path: '/',
          search: '',
          host: 'localhost:8080',
          protocol: 'http:',
          hash: '',
          referrer: 'http://localhost:8080/',
          timestamp: 1750851251584,
        },
        session: {
          sessionId: '34eed1e7-f078-4ddd-bcd9-1ed9de5c097f',
          startTime: 1750656609125,
          lastActiveTime: 1750851251079,
          totalActiveTime: 2423033,
          isActive: true,
          isIdle: false,
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'a6dd6240-a391-4487-ac63-7f379e2327f6',
        visitorId,
        eventType: 'user_resume',
        metadata,
        occurredAt: new Date('2025-06-25T11:34:11.583Z'),
      });

      const logSpy = jest.spyOn(handler['logger'], 'log');

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        'Evento de tipo user_resume ignorado (solo se procesan eventos page_view)',
      );
    });
  });
});
