import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler } from '../update-visitor-connection-time-on-tracking-event-created.event-handler';
import { TrackingEventCreatedEvent } from 'src/context/tracking/domain/events/tracking-event-created-event';
import { UpdateVisitorConnectionTimeCommand } from '../../commands/update-visitor-connection-time.command';

describe('UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler', () => {
  let handler: UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler;
  let mockCommandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    // Creamos un mock del CommandBus
    mockCommandBus = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
      ],
    }).compile();

    handler =
      module.get<UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler>(
        UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should execute UpdateVisitorConnectionTimeCommand when metadata has valid totalActiveTime', async () => {
      // Arrange
      const visitorId = 'visitor-123';
      const totalActiveTime = 228608;
      const metadata = {
        page: {
          url: 'http://localhost:8080/',
          hash: '',
          host: 'localhost:8080',
          path: '/',
          search: '',
          protocol: 'http:',
          referrer: 'http://localhost:8080/',
          timestamp: 1753183305445,
        },
        device: {
          touch: { maxTouchPoints: 0 },
          screen: { width: 1512, height: 982, pixelRatio: 2 },
          hardware: { cores: 8 },
          language: 'es-ES',
          platform: 'MacIntel',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        },
        session: {
          isIdle: false,
          isActive: true,
          sessionId: '98e97d46-9728-4614-b303-7f0468ef9794',
          startTime: 1753182387923,
          lastActiveTime: 1753183302672,
          totalActiveTime,
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
        new UpdateVisitorConnectionTimeCommand(visitorId, totalActiveTime),
      );
    });

    it('should execute UpdateVisitorConnectionTimeCommand with different event types', async () => {
      // Arrange
      const visitorId = 'visitor-456';
      const totalActiveTime = 500000;
      const metadata = {
        session: {
          totalActiveTime,
          sessionId: 'session-456',
          isActive: true,
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-456',
        visitorId,
        eventType: 'scroll', // Evento diferente a page_view
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorConnectionTimeCommand(visitorId, totalActiveTime),
      );
    });

    it('should execute UpdateVisitorConnectionTimeCommand when totalActiveTime is a string number', async () => {
      // Arrange
      const visitorId = 'visitor-789';
      const totalActiveTime = '150000';
      const metadata = {
        session: {
          totalActiveTime,
          sessionId: 'session-789',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-789',
        visitorId,
        eventType: 'click',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorConnectionTimeCommand(visitorId, 150000),
      );
    });

    it('should not execute command when session metadata is missing', async () => {
      // Arrange
      const visitorId = 'visitor-no-session';
      const metadata = {
        page: {
          url: 'http://localhost:8080/',
        },
        device: {
          platform: 'MacIntel',
        },
        // session está ausente
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-no-session',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not execute command when totalActiveTime is missing', async () => {
      // Arrange
      const visitorId = 'visitor-no-time';
      const metadata = {
        session: {
          sessionId: 'session-without-time',
          isActive: true,
          // totalActiveTime está ausente
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-no-time',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not execute command when totalActiveTime is negative', async () => {
      // Arrange
      const visitorId = 'visitor-negative-time';
      const metadata = {
        session: {
          totalActiveTime: -1000,
          sessionId: 'session-negative',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-negative',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not execute command when totalActiveTime is zero', async () => {
      // Arrange
      const visitorId = 'visitor-zero-time';
      const metadata = {
        session: {
          totalActiveTime: 0,
          sessionId: 'session-zero',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-zero',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should not execute command when totalActiveTime is not a valid number string', async () => {
      // Arrange
      const visitorId = 'visitor-invalid-time';
      const metadata = {
        session: {
          totalActiveTime: 'invalid-number',
          sessionId: 'session-invalid',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-invalid',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should handle CommandBus execution errors gracefully', async () => {
      // Arrange
      const visitorId = 'visitor-error';
      const totalActiveTime = 100000;
      const metadata = {
        session: {
          totalActiveTime,
          sessionId: 'session-error',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-error',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      const errorMessage = 'Command execution failed';
      mockCommandBus.execute.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle empty metadata gracefully', async () => {
      // Arrange
      const visitorId = 'visitor-empty-metadata';
      const metadata = {};

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-empty',
        visitorId,
        eventType: 'page_view',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('extractConnectionTimeFromMetadata', () => {
    // Tests de método privado indirectamente a través del método handle
    it('should extract totalActiveTime correctly from complex metadata structure', async () => {
      // Arrange
      const visitorId = 'visitor-complex';
      const expectedTime = 999999;
      const metadata = {
        page: {
          url: 'http://example.com',
          title: 'Example Page',
        },
        device: {
          userAgent: 'Test Agent',
          screen: { width: 1920, height: 1080 },
        },
        session: {
          sessionId: 'complex-session',
          startTime: Date.now(),
          lastActiveTime: Date.now(),
          totalActiveTime: expectedTime,
          isActive: true,
          isIdle: false,
        },
        customData: {
          someField: 'someValue',
        },
      };

      const event = new TrackingEventCreatedEvent({
        id: 'tracking-event-complex',
        visitorId,
        eventType: 'interaction',
        metadata,
        occurredAt: new Date(),
      });

      mockCommandBus.execute.mockResolvedValue(undefined);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorConnectionTimeCommand(visitorId, expectedTime),
      );
    });
  });
});
