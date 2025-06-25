import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler } from '../update-visitor-current-page-on-tracking-event-created.event-handler';
import { TrackingEventCreatedEvent } from 'src/context/tracking/domain/events/tracking-event-created-event';
import { UpdateVisitorCurrentPageCommandHandler } from '../../commands/update-visitor-current-page-command.handler';
import { VISITOR_REPOSITORY } from '../../../domain/visitor.repository';
import { ok } from 'src/context/shared/domain/result';

describe('UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler Integration Test', () => {
  let eventHandler: UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler;
  let mockVisitorRepository: any;

  beforeEach(async () => {
    // Mock del repositorio de visitantes
    mockVisitorRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler,
        UpdateVisitorCurrentPageCommandHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: mockVisitorRepository,
        },
      ],
    }).compile();

    eventHandler =
      module.get<UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler>(
        UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler,
      );

    // Inicializar la aplicación para que CQRS registre automáticamente los handlers
    await module.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Integration Flow', () => {
    it('should handle complete flow from TrackingEventCreatedEvent to visitor update', async () => {
      // Arrange
      const visitorId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedPage = 'http://localhost:8080/vehicle-search'; // Ahora priorizamos page_url

      const trackingEvent = new TrackingEventCreatedEvent({
        id: 'tracking-event-integration',
        visitorId,
        eventType: 'page_view',
        metadata: {
          page: {
            url: 'http://localhost:8080/vehicle-search', // Esta tendrá prioridad
            path: '/vehicle-search',
            title: 'Vehicle Search',
            referrer: 'http://localhost:8080/vehicle-comparison',
          },
          page_url: 'http://localhost:8080/vehicle-search-old', // Fallback legacy
          timestamp_url_injection: 1749630189102,
        },
        occurredAt: new Date(),
      });

      // Mock del visitor existente
      const mockVisitor = {
        id: { value: visitorId },
        updateCurrentPage: jest.fn().mockReturnValue({
          // Simula el visitor actualizado
          id: { value: visitorId },
          currentPage: { get: () => ({ value: expectedPage }) },
          commit: jest.fn(),
        }),
      };

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));
      mockVisitorRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await eventHandler.handle(trackingEvent);

      // Assert
      expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: visitorId }),
      );
    });

    it('should handle events with page_path when page_url and page are not available', async () => {
      // Arrange
      const visitorId = '987fcdeb-51a2-43d1-9f33-426614174111';
      const expectedPage = '/about-us';

      const trackingEvent = new TrackingEventCreatedEvent({
        id: 'tracking-event-integration-2',
        visitorId,
        eventType: 'page_view',
        metadata: {
          page: {
            path: expectedPage, // Solo page.path disponible
          },
          page_host: 'localhost:8080',
        },
        occurredAt: new Date(),
      });

      const mockVisitor = {
        id: { value: visitorId },
        updateCurrentPage: jest.fn().mockReturnValue({
          id: { value: visitorId },
          currentPage: { get: () => ({ value: expectedPage }) },
          commit: jest.fn(),
        }),
      };

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));
      mockVisitorRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await eventHandler.handle(trackingEvent);

      // Assert
      expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: visitorId }),
      );
    });

    it('should ignore non-page_view events', async () => {
      // Arrange
      const trackingEvent = new TrackingEventCreatedEvent({
        id: 'tracking-event-click',
        visitorId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        eventType: 'button_click',
        metadata: {
          button_id: 'submit-btn',
          page: {
            url: 'http://localhost:8080/contact-form',
          },
        },
        occurredAt: new Date(),
      });

      // Act
      await eventHandler.handle(trackingEvent);

      // Assert
      expect(mockVisitorRepository.findById).not.toHaveBeenCalled();
      expect(mockVisitorRepository.save).not.toHaveBeenCalled();
    });

    it('should handle events with no valid page information gracefully', async () => {
      // Arrange
      const trackingEvent = new TrackingEventCreatedEvent({
        id: 'tracking-event-no-page',
        visitorId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'page_view',
        metadata: {
          timestamp: 1749630189102,
          user_agent: 'Mozilla/5.0...',
          // No page information
        },
        occurredAt: new Date(),
      });

      // Act
      await eventHandler.handle(trackingEvent);

      // Assert
      expect(mockVisitorRepository.findById).not.toHaveBeenCalled();
      expect(mockVisitorRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle metadata with empty strings correctly', async () => {
      // Arrange
      const visitorId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const expectedPage = 'http://localhost:8080/fallback';

      const trackingEvent = new TrackingEventCreatedEvent({
        id: 'tracking-event-empty-strings',
        visitorId,
        eventType: 'page_view',
        metadata: {
          page: {
            url: expectedPage, // Valid URL in page.url
            path: '   ', // Whitespace only
          },
          page_url: 'http://localhost:8080/ignored', // Should be ignored since page.url exists
        },
        occurredAt: new Date(),
      });

      const mockVisitor = {
        id: { value: visitorId },
        updateCurrentPage: jest.fn().mockReturnValue({
          id: { value: visitorId },
          currentPage: { get: () => ({ value: expectedPage }) },
          commit: jest.fn(),
        }),
      };

      mockVisitorRepository.findById.mockResolvedValue(ok(mockVisitor));
      mockVisitorRepository.save.mockResolvedValue(ok(undefined));

      // Act
      await eventHandler.handle(trackingEvent);

      // Assert - Debería usar page.url
      expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({ value: visitorId }),
      );
    });

    it('should handle metadata with null/undefined values correctly', async () => {
      // Arrange
      const trackingEvent = new TrackingEventCreatedEvent({
        id: 'tracking-event-null-values',
        visitorId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        eventType: 'page_view',
        metadata: {
          page: null,
          page_url: null,
          other_data: 'some_value',
        },
        occurredAt: new Date(),
      });

      // Act
      await eventHandler.handle(trackingEvent);

      // Assert - No debería intentar actualizar porque no hay página válida
      expect(mockVisitorRepository.findById).not.toHaveBeenCalled();
      expect(mockVisitorRepository.save).not.toHaveBeenCalled();
    });
  });
});
