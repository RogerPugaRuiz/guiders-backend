import { TrackingEvent } from '../tracking-event.aggregate';
import {
  TrackingEventId,
  EventType,
  EventMetadata,
  EventOccurredAt,
  VisitorId,
  SessionId,
  TenantId,
  SiteId,
} from '../value-objects';
import { Uuid } from '../../../shared/domain/value-objects/uuid';
import { TrackingEventCreatedEvent } from '../events/tracking-event-created.event';

describe('TrackingEvent', () => {
  let validId: TrackingEventId;
  let validVisitorId: VisitorId;
  let validSessionId: SessionId;
  let validTenantId: TenantId;
  let validSiteId: SiteId;
  let validEventType: EventType;
  let validMetadata: EventMetadata;
  let validOccurredAt: EventOccurredAt;

  beforeEach(() => {
    validId = TrackingEventId.random();
    validVisitorId = new VisitorId(Uuid.random().value);
    validSessionId = new SessionId(Uuid.random().value);
    validTenantId = new TenantId(Uuid.random().value);
    validSiteId = new SiteId(Uuid.random().value);
    validEventType = EventType.pageView();
    validMetadata = new EventMetadata({ url: '/home', title: 'Home Page' });
    validOccurredAt = EventOccurredAt.now();
  });

  describe('create', () => {
    it('debe crear TrackingEvent con parámetros válidos', () => {
      // Act
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
        occurredAt: validOccurredAt,
      });

      // Assert
      expect(event).toBeInstanceOf(TrackingEvent);
      expect(event.getId()).toBe(validId);
      expect(event.getVisitorId()).toBe(validVisitorId);
      expect(event.getSessionId()).toBe(validSessionId);
      expect(event.getTenantId()).toBe(validTenantId);
      expect(event.getSiteId()).toBe(validSiteId);
      expect(event.getEventType()).toBe(validEventType);
      expect(event.getMetadata()).toBe(validMetadata);
      expect(event.getOccurredAt()).toBe(validOccurredAt);
      expect(event.getCount()).toBe(1);
    });

    it('debe crear TrackingEvent con occurredAt por defecto (now)', () => {
      // Act
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      // Assert
      expect(event.getOccurredAt()).toBeDefined();
      expect(event.getOccurredAt().value).toBeInstanceOf(Date);
    });

    it('debe crear TrackingEvent con count personalizado', () => {
      // Act
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
        count: 5,
      });

      // Assert
      expect(event.getCount()).toBe(5);
    });

    it('debe emitir TrackingEventCreatedEvent al crear evento', () => {
      // Act
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      // Assert
      const events = event.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TrackingEventCreatedEvent);
      expect((events[0] as TrackingEventCreatedEvent).attributes.id).toBe(
        validId.getValue(),
      );
    });
  });

  describe('fromPrimitives', () => {
    it('debe reconstruir TrackingEvent desde primitivos', () => {
      // Arrange
      const primitives = {
        id: Uuid.random().value,
        visitorId: Uuid.random().value,
        sessionId: Uuid.random().value,
        tenantId: Uuid.random().value,
        siteId: Uuid.random().value,
        eventType: 'PAGE_VIEW',
        metadata: { url: '/home' },
        occurredAt: '2024-01-15T10:30:00.000Z',
        count: 3,
      };

      // Act
      const event = TrackingEvent.fromPrimitives(primitives);

      // Assert
      expect(event).toBeInstanceOf(TrackingEvent);
      expect(event.getId().getValue()).toBe(primitives.id);
      expect(event.getVisitorId().getValue()).toBe(primitives.visitorId);
      expect(event.getCount()).toBe(3);
      expect(event.getUncommittedEvents()).toHaveLength(0); // fromPrimitives no emite eventos
    });
  });

  describe('toPrimitives', () => {
    it('debe convertir TrackingEvent a primitivos correctamente', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
        occurredAt: validOccurredAt,
      });

      // Act
      const primitives = event.toPrimitives();

      // Assert
      expect(primitives.id).toBe(validId.getValue());
      expect(primitives.visitorId).toBe(validVisitorId.getValue());
      expect(primitives.sessionId).toBe(validSessionId.getValue());
      expect(primitives.tenantId).toBe(validTenantId.getValue());
      expect(primitives.siteId).toBe(validSiteId.getValue());
      expect(primitives.eventType).toBe('PAGE_VIEW');
      expect(primitives.metadata).toEqual({ url: '/home', title: 'Home Page' });
      expect(primitives.count).toBe(1);
    });
  });

  describe('incrementCount', () => {
    it('debe incrementar el contador en 1 por defecto', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      // Act
      event.incrementCount();

      // Assert
      expect(event.getCount()).toBe(2);
    });

    it('debe incrementar el contador en cantidad especificada', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      // Act
      event.incrementCount(5);

      // Assert
      expect(event.getCount()).toBe(6);
    });
  });

  describe('canAggregateWith', () => {
    it('debe retornar true para eventos con mismo visitante, sesión, tipo y metadata', () => {
      // Arrange
      const event1 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
        occurredAt: EventOccurredAt.now(),
      });

      const event2 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: new EventMetadata({ url: '/home', title: 'Home Page' }),
        occurredAt: EventOccurredAt.now(),
      });

      // Act & Assert
      expect(event1.canAggregateWith(event2)).toBe(true);
    });

    it('debe retornar false para eventos de diferentes visitantes', () => {
      // Arrange
      const event1 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      const event2 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: new VisitorId(Uuid.random().value),
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      // Act & Assert
      expect(event1.canAggregateWith(event2)).toBe(false);
    });

    it('debe retornar false para eventos de diferentes tipos', () => {
      // Arrange
      const event1 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.pageView(),
        metadata: validMetadata,
      });

      const event2 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.click(),
        metadata: validMetadata,
      });

      // Act & Assert
      expect(event1.canAggregateWith(event2)).toBe(false);
    });
  });

  describe('isHighFrequency', () => {
    it('debe retornar true para eventos de alta frecuencia', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.scroll(),
        metadata: validMetadata,
      });

      // Act & Assert
      expect(event.isHighFrequency()).toBe(true);
    });

    it('debe retornar false para eventos normales', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.pageView(),
        metadata: validMetadata,
      });

      // Act & Assert
      expect(event.isHighFrequency()).toBe(false);
    });
  });

  describe('isCritical', () => {
    it('debe retornar true para eventos críticos', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.formSubmit(),
        metadata: validMetadata,
      });

      // Act & Assert
      expect(event.isCritical()).toBe(true);
    });

    it('debe retornar false para eventos no críticos', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: EventType.scroll(),
        metadata: validMetadata,
      });

      // Act & Assert
      expect(event.isCritical()).toBe(false);
    });
  });

  describe('getPartitionKey', () => {
    it('debe retornar la clave de partición correcta', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00.000Z');
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
        occurredAt: new EventOccurredAt(date),
      });

      // Act
      const partitionKey = event.getPartitionKey();

      // Assert
      expect(partitionKey).toBe('2024_01');
    });
  });

  describe('getAggregationKey', () => {
    it('debe generar una clave de agregación única', () => {
      // Arrange
      const event = TrackingEvent.create({
        id: validId,
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      // Act
      const key = event.getAggregationKey();

      // Assert
      expect(key).toContain(validVisitorId.getValue());
      expect(key).toContain(validSessionId.getValue());
      expect(key).toContain('PAGE_VIEW');
      expect(typeof key).toBe('string');
    });

    it('debe generar misma clave para eventos agregables', () => {
      // Arrange
      const event1 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: validMetadata,
      });

      const event2 = TrackingEvent.create({
        id: TrackingEventId.random(),
        visitorId: validVisitorId,
        sessionId: validSessionId,
        tenantId: validTenantId,
        siteId: validSiteId,
        eventType: validEventType,
        metadata: new EventMetadata({ url: '/home', title: 'Home Page' }),
      });

      // Act
      const key1 = event1.getAggregationKey();
      const key2 = event2.getAggregationKey();

      // Assert
      expect(key1).toBe(key2);
    });
  });
});
