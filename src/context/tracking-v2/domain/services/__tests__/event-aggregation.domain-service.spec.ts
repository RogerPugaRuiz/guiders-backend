import {
  EventAggregationDomainService,
  AggregationResult,
  AggregationSummary,
} from '../event-aggregation.domain-service';
import { TrackingEvent } from '../../tracking-event.aggregate';
import {
  TrackingEventId,
  EventType,
  EventMetadata,
  EventOccurredAt,
  VisitorId,
  SessionId,
  TenantId,
  SiteId,
} from '../../value-objects';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('EventAggregationDomainService', () => {
  let service: EventAggregationDomainService;
  let validVisitorId: VisitorId;
  let validSessionId: SessionId;
  let validTenantId: TenantId;
  let validSiteId: SiteId;

  beforeEach(() => {
    service = new EventAggregationDomainService();
    validVisitorId = new VisitorId(Uuid.random().value);
    validSessionId = new SessionId(Uuid.random().value);
    validTenantId = new TenantId(Uuid.random().value);
    validSiteId = new SiteId(Uuid.random().value);
  });

  const createEvent = (
    eventType: EventType,
    metadata: EventMetadata,
    occurredAt?: EventOccurredAt,
  ): TrackingEvent => {
    return TrackingEvent.create({
      id: TrackingEventId.random(),
      visitorId: validVisitorId,
      sessionId: validSessionId,
      tenantId: validTenantId,
      siteId: validSiteId,
      eventType,
      metadata,
      occurredAt: occurredAt || EventOccurredAt.now(),
    });
  };

  describe('aggregate', () => {
    it('debe agregar eventos duplicados en un único evento con contador', () => {
      // Arrange
      const metadata = new EventMetadata({ url: '/home' });
      const events = [
        createEvent(EventType.pageView(), metadata),
        createEvent(EventType.pageView(), metadata),
        createEvent(EventType.pageView(), metadata),
      ];

      // Act
      const result: AggregationResult = service.aggregate(events);

      // Assert
      expect(result.originalCount).toBe(3);
      expect(result.aggregatedCount).toBe(1);
      expect(result.aggregated[0].getCount()).toBe(3);
      expect(result.reductionRate).toBeCloseTo(66.67, 1);
    });

    it('debe mantener eventos diferentes sin agregar', () => {
      // Arrange
      const events = [
        createEvent(EventType.pageView(), new EventMetadata({ url: '/home' })),
        createEvent(
          EventType.click(),
          new EventMetadata({ element: 'button' }),
        ),
        createEvent(EventType.scroll(), new EventMetadata({ depth: 50 })),
      ];

      // Act
      const result = service.aggregate(events);

      // Assert
      expect(result.originalCount).toBe(3);
      expect(result.aggregatedCount).toBe(3);
      expect(result.reductionRate).toBe(0);
    });

    it('debe agregar eventos con misma metadata pero diferentes timestamps dentro de ventana', () => {
      // Arrange
      const baseTime = new Date('2024-01-15T10:00:00.000Z');
      const metadata = new EventMetadata({ url: '/products' });

      const events = [
        createEvent(
          EventType.pageView(),
          metadata,
          new EventOccurredAt(baseTime),
        ),
        createEvent(
          EventType.pageView(),
          metadata,
          new EventOccurredAt(new Date(baseTime.getTime() + 30000)), // +30s
        ),
        createEvent(
          EventType.pageView(),
          metadata,
          new EventOccurredAt(new Date(baseTime.getTime() + 45000)), // +45s
        ),
      ];

      // Act
      const result = service.aggregate(events);

      // Assert
      expect(result.aggregatedCount).toBe(1);
      expect(result.aggregated[0].getCount()).toBe(3);
    });

    it('debe NO agregar eventos fuera de la ventana temporal', () => {
      // Arrange
      const baseTime = new Date('2024-01-15T10:00:00.000Z');
      const metadata = new EventMetadata({ url: '/products' });

      const events = [
        createEvent(
          EventType.pageView(),
          metadata,
          new EventOccurredAt(baseTime),
        ),
        createEvent(
          EventType.pageView(),
          metadata,
          new EventOccurredAt(new Date(baseTime.getTime() + 120000)), // +2min (fuera de ventana de 1min)
        ),
      ];

      // Act
      const result = service.aggregate(events);

      // Assert
      // No se pueden agregar porque están fuera de la ventana de 60 segundos
      expect(result.aggregatedCount).toBe(2);
      expect(result.aggregated[0].getCount()).toBe(1);
      expect(result.aggregated[1].getCount()).toBe(1);
    });

    it('debe calcular estadísticas por tipo correctamente', () => {
      // Arrange
      const events = [
        createEvent(EventType.pageView(), new EventMetadata({ url: '/home' })),
        createEvent(EventType.pageView(), new EventMetadata({ url: '/home' })),
        createEvent(EventType.click(), new EventMetadata({ element: 'btn' })),
        createEvent(EventType.click(), new EventMetadata({ element: 'btn' })),
        createEvent(EventType.click(), new EventMetadata({ element: 'btn' })),
      ];

      // Act
      const result = service.aggregate(events);

      // Assert
      expect(result.aggregatedByType.PAGE_VIEW).toBe(2);
      expect(result.aggregatedByType.CLICK).toBe(3);
    });

    it('debe retornar array vacío con input vacío', () => {
      // Arrange
      const events: TrackingEvent[] = [];

      // Act
      const result = service.aggregate(events);

      // Assert
      expect(result.aggregated).toEqual([]);
      expect(result.originalCount).toBe(0);
      expect(result.aggregatedCount).toBe(0);
      expect(result.reductionRate).toBe(0);
    });

    it('debe manejar eventos mixtos con diferentes niveles de agregación', () => {
      // Arrange
      const sharedMetadata = new EventMetadata({ url: '/checkout' });
      const events = [
        // 3 eventos iguales que se deben agregar
        createEvent(EventType.pageView(), sharedMetadata),
        createEvent(EventType.pageView(), sharedMetadata),
        createEvent(EventType.pageView(), sharedMetadata),
        // 2 eventos diferentes que NO se agregan
        createEvent(EventType.click(), new EventMetadata({ btn: 'submit' })),
        createEvent(EventType.scroll(), new EventMetadata({ depth: 100 })),
      ];

      // Act
      const result = service.aggregate(events);

      // Assert
      expect(result.originalCount).toBe(5);
      expect(result.aggregatedCount).toBe(3); // 1 agregado + 2 únicos

      // Encontrar el evento agregado
      const aggregatedPageView = result.aggregated.find(
        (e) => e.getEventType().getValue() === 'PAGE_VIEW',
      );
      expect(aggregatedPageView).toBeDefined();
      expect(aggregatedPageView!.getCount()).toBe(3);
    });
  });

  describe('aggregateByVisitor', () => {
    it('debe agrupar eventos por visitante', () => {
      // Arrange
      const visitor1 = new VisitorId(Uuid.random().value);
      const visitor2 = new VisitorId(Uuid.random().value);

      const event1 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: visitor1,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.pageView(),
        metadata: EventMetadata.empty(),
      });

      const event2 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: visitor1,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.click(),
        metadata: EventMetadata.empty(),
      });

      const event3 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: visitor2,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.pageView(),
        metadata: EventMetadata.empty(),
      });

      const events = [event1, event2, event3];

      // Act
      const result = service.aggregateByVisitor(events);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get(visitor1.getValue())).toHaveLength(2);
      expect(result.get(visitor2.getValue())).toHaveLength(1);
    });

    it('debe retornar mapa vacío con input vacío', () => {
      // Arrange
      const events: TrackingEvent[] = [];

      // Act
      const result = service.aggregateByVisitor(events);

      // Assert
      expect(result.size).toBe(0);
    });
  });

  describe('aggregateBySession', () => {
    it('debe agrupar eventos por sesión', () => {
      // Arrange
      const session1 = new SessionId(Uuid.random().value);
      const session2 = new SessionId(Uuid.random().value);

      const event1 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: session1,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.pageView(),
        metadata: EventMetadata.empty(),
      });

      const event2 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: session1,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.click(),
        metadata: EventMetadata.empty(),
      });

      const event3 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: session2,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.pageView(),
        metadata: EventMetadata.empty(),
      });

      const events = [event1, event2, event3];

      // Act
      const result = service.aggregateBySession(events);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get(session1.getValue())).toHaveLength(2);
      expect(result.get(session2.getValue())).toHaveLength(1);
    });
  });

  describe('aggregateByType', () => {
    it('debe agrupar eventos por tipo', () => {
      // Arrange
      const events = [
        createEvent(EventType.pageView(), EventMetadata.empty()),
        createEvent(EventType.pageView(), EventMetadata.empty()),
        createEvent(EventType.click(), EventMetadata.empty()),
        createEvent(EventType.scroll(), EventMetadata.empty()),
        createEvent(EventType.scroll(), EventMetadata.empty()),
        createEvent(EventType.scroll(), EventMetadata.empty()),
      ];

      // Act
      const result = service.aggregateByType(events);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get('PAGE_VIEW')).toHaveLength(2);
      expect(result.get('CLICK')).toHaveLength(1);
      expect(result.get('SCROLL')).toHaveLength(3);
    });
  });

  describe('getTotalEventsCount', () => {
    it('debe contar eventos totales incluyendo contadores', () => {
      // Arrange
      const event1 = createEvent(EventType.pageView(), EventMetadata.empty());
      event1.incrementCount(4); // count = 5

      const event2 = createEvent(EventType.click(), EventMetadata.empty());
      event2.incrementCount(2); // count = 3

      const event3 = createEvent(EventType.scroll(), EventMetadata.empty());
      // count = 1 (default)

      const events = [event1, event2, event3];

      // Act
      const total = service.getTotalEventsCount(events);

      // Assert
      expect(total).toBe(9); // 5 + 3 + 1
    });

    it('debe retornar 0 con array vacío', () => {
      // Arrange
      const events: TrackingEvent[] = [];

      // Act
      const total = service.getTotalEventsCount(events);

      // Assert
      expect(total).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('debe generar resumen correcto de agregación', () => {
      // Arrange
      const event1 = createEvent(EventType.pageView(), EventMetadata.empty());
      event1.incrementCount(4); // count = 5

      const event2 = createEvent(EventType.pageView(), EventMetadata.empty());
      event2.incrementCount(2); // count = 3

      const event3 = createEvent(EventType.click(), EventMetadata.empty());
      // count = 1

      const events = [event1, event2, event3];

      // Act
      const summary: AggregationSummary = service.getSummary(events);

      // Assert
      expect(summary.totalEvents).toBe(9); // 5 + 3 + 1
      expect(summary.uniqueEvents).toBe(3);
      expect(summary.averageCount).toBe(3); // 9 / 3
      expect(summary.eventsByType.PAGE_VIEW).toBe(2); // 2 eventos únicos de PAGE_VIEW
      expect(summary.eventsByType.CLICK).toBe(1); // 1 evento único de CLICK
      expect(summary.countByType.PAGE_VIEW).toBe(8); // 5 + 3
      expect(summary.countByType.CLICK).toBe(1);
    });

    it('debe manejar array vacío correctamente', () => {
      // Arrange
      const events: TrackingEvent[] = [];

      // Act
      const summary = service.getSummary(events);

      // Assert
      expect(summary.totalEvents).toBe(0);
      expect(summary.uniqueEvents).toBe(0);
      expect(summary.averageCount).toBe(0);
      expect(summary.eventsByType).toEqual({});
      expect(summary.countByType).toEqual({});
    });
  });
});
