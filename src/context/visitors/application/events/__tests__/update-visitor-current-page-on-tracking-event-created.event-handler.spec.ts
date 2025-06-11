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
    it('should execute UpdateVisitorCurrentPageCommand when event type is page_view and has page in metadata', async () => {
      // Arrange
      const visitorId = 'visitor-123';
      const metadata = {
        page: 'vehicle_search',
        page_url: 'http://localhost:8080/vehicle-search',
        referrer: 'http://localhost:8080/vehicle-comparison',
        page_hash: '',
        page_host: 'localhost:8080',
        page_path: '/vehicle-search',
        page_search: '',
        page_protocol: 'http:',
        timestamp_url_injection: 1749630189102,
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

    it('should execute UpdateVisitorCurrentPageCommand with page_url when available (highest priority)', async () => {
      // Arrange
      const visitorId = 'visitor-456';
      const metadata = {
        page_url: 'http://localhost:8080/vehicle-comparison',
        page_path: '/vehicle-comparison',
        page_host: 'localhost:8080',
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

    it('should execute UpdateVisitorCurrentPageCommand with page_url when page and page_path are not available', async () => {
      // Arrange
      const visitorId = 'visitor-789';
      const metadata = {
        page_url: 'http://localhost:8080/home',
        page_host: 'localhost:8080',
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
        new UpdateVisitorCurrentPageCommand(
          visitorId,
          'http://localhost:8080/home',
        ),
      );
    });

    it('should execute UpdateVisitorCurrentPageCommand with page_path when page_url and page are not available', async () => {
      // Arrange
      const visitorId = 'visitor-999';
      const metadata = {
        page_path: '/about-us',
        page_host: 'localhost:8080',
        referrer: 'http://localhost:8080/home',
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-999',
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
        page: 'some-page',
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

    it('should not execute command when page_view event has no page information in metadata', async () => {
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

    it('should log correct messages during successful execution', async () => {
      // Arrange
      const visitorId = 'visitor-333';
      const metadata = {
        page: 'contact_page',
        page_url: 'http://localhost:8080/contact',
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-333',
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
        page: 'error_page',
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
        page: 'unknown_error_page',
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

    it('should work with different metadata formats and prioritize page_url over page and page_path', async () => {
      // Arrange
      const testCases = [
        {
          metadata: {
            page: 'home',
            page_path: '/home',
            page_url: 'http://example.com/home',
          },
          expected: 'http://example.com/home', // page_url tiene mayor prioridad
        },
        {
          metadata: {
            page: 'about',
            page_path: '/about',
          },
          expected: 'about', // page tiene prioridad sobre page_path
        },
        {
          metadata: {
            page_path: '/services',
            page_url: 'http://example.com/services',
          },
          expected: 'http://example.com/services', // page_url tiene mayor prioridad
        },
        {
          metadata: { page_path: '/contact' },
          expected: '/contact', // solo page_path disponible
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
            page: '',
            page_path: '/valid-path',
            page_url: 'http://example.com/url',
          },
          expected: 'http://example.com/url', // page_url tiene mayor prioridad
        },
        {
          metadata: {
            page: 'valid-page',
            page_path: '',
            page_url: '   ', // page_url vacío
          },
          expected: 'valid-page', // page tiene segunda prioridad
        },
        {
          metadata: {
            page: null,
            page_path: '/valid-path',
            page_url: undefined,
          },
          expected: '/valid-path', // page_path como última opción
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
  });
});
