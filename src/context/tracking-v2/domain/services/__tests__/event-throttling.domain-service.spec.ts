import {
  EventThrottlingDomainService,
  DEFAULT_THROTTLING_CONFIG,
} from '../event-throttling.domain-service';
import { TrackingEvent } from '../../tracking-event.aggregate';
import {
  TrackingEventId,
  EventType,
  EventMetadata,
  VisitorId,
  SessionId,
  TenantId,
  SiteId,
} from '../../value-objects';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('EventThrottlingDomainService', () => {
  let service: EventThrottlingDomainService;
  let validVisitorId: VisitorId;
  let validSessionId: SessionId;
  let validTenantId: TenantId;
  let validSiteId: SiteId;

  beforeEach(() => {
    service = new EventThrottlingDomainService();
    validVisitorId = new VisitorId(Uuid.random().value);
    validSessionId = new SessionId(Uuid.random().value);
    validTenantId = new TenantId(Uuid.random().value);
    validSiteId = new SiteId(Uuid.random().value);
  });

  const createEvent = (eventType: EventType): TrackingEvent => {
    return TrackingEvent.create({
      id: TrackingEventId.random(),
      visitorId: validVisitorId,
      sessionId: validSessionId,
      tenantId: validTenantId,
      siteId: validSiteId,
      eventType,
      metadata: EventMetadata.empty(),
    });
  };

  describe('apply', () => {
    it('debe conservar todos los eventos críticos', () => {
      // Arrange
      const events = [
        createEvent(EventType.formSubmit()),
        createEvent(EventType.formSubmit()),
        createEvent(EventType.formSubmit()),
      ];

      // Act
      const result = service.apply(events);

      // Assert
      expect(result).toHaveLength(3);
    });

    it('debe conservar todos los eventos PAGE_VIEW (100%)', () => {
      // Arrange
      const events = Array(100)
        .fill(null)
        .map(() => createEvent(EventType.pageView()));

      // Act
      const result = service.apply(events);

      // Assert
      expect(result).toHaveLength(100);
    });

    it('debe descartar aproximadamente 90% de eventos SCROLL (samplingRate=10%)', () => {
      // Arrange
      const events = Array(1000)
        .fill(null)
        .map(() => createEvent(EventType.scroll()));

      // Act
      const result = service.apply(events);

      // Assert
      // Debe conservar aproximadamente 10% (100 eventos)
      // Con margen de error para aleatoriedad
      expect(result.length).toBeGreaterThan(50);
      expect(result.length).toBeLessThan(150);
    });

    it('debe manejar eventos mixtos correctamente', () => {
      // Arrange
      const events = [
        ...Array(10)
          .fill(null)
          .map(() => createEvent(EventType.pageView())),
        ...Array(100)
          .fill(null)
          .map(() => createEvent(EventType.scroll())),
      ];

      // Act
      const result = service.apply(events);

      // Assert
      // Todos los PAGE_VIEW deben conservarse (10)
      // Aproximadamente 10% de SCROLL (10)
      // Total esperado: ~20 eventos
      expect(result.length).toBeGreaterThan(10);
    });

    it('debe retornar array vacío con input vacío', () => {
      // Arrange
      const events: TrackingEvent[] = [];

      // Act
      const result = service.apply(events);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getThrottlingStats', () => {
    it('debe calcular estadísticas correctamente', () => {
      // Arrange
      const originalEvents = Array(100)
        .fill(null)
        .map(() => createEvent(EventType.scroll()));

      const filteredEvents = service.apply(originalEvents);

      // Act
      const stats = service.getThrottlingStats(originalEvents, filteredEvents);

      // Assert
      expect(stats.totalOriginal).toBe(100);
      expect(stats.totalFiltered).toBeLessThan(100);
      expect(stats.discarded).toBe(stats.totalOriginal - stats.totalFiltered);
      expect(stats.discardRate).toBeGreaterThan(0);
      expect(stats.discardedByType).toHaveProperty('SCROLL');
    });

    it('debe retornar cero descartados si todos se conservan', () => {
      // Arrange
      const originalEvents = Array(10)
        .fill(null)
        .map(() => createEvent(EventType.pageView()));

      const filteredEvents = service.apply(originalEvents);

      // Act
      const stats = service.getThrottlingStats(originalEvents, filteredEvents);

      // Assert
      expect(stats.discarded).toBe(0);
      expect(stats.discardRate).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('debe actualizar configuración para un tipo de evento', () => {
      // Arrange
      service.updateConfig('CUSTOM_EVENT', {
        samplingRate: 50,
        alwaysKeep: false,
      });

      const events = Array(100)
        .fill(null)
        .map(() => createEvent(EventType.create('CUSTOM_EVENT')));

      // Act
      const result = service.apply(events);

      // Assert
      // Debe conservar aproximadamente 50%
      expect(result.length).toBeGreaterThan(30);
      expect(result.length).toBeLessThan(70);
    });

    it('debe sobrescribir configuración existente', () => {
      // Arrange
      service.updateConfig('PAGE_VIEW', {
        samplingRate: 50,
        alwaysKeep: false,
      });

      const events = Array(100)
        .fill(null)
        .map(() => createEvent(EventType.pageView()));

      // Act
      const result = service.apply(events);

      // Assert
      // Ahora debe conservar solo ~50% en lugar de 100%
      expect(result.length).toBeLessThan(100);
    });
  });

  describe('getConfig', () => {
    it('debe retornar la configuración actual', () => {
      // Act
      const config = service.getConfig();

      // Assert
      expect(config).toHaveProperty('PAGE_VIEW');
      expect(config.PAGE_VIEW).toEqual(DEFAULT_THROTTLING_CONFIG.PAGE_VIEW);
    });

    it('debe retornar una copia de la configuración', () => {
      // Arrange
      const config1 = service.getConfig();

      // Act
      config1.PAGE_VIEW = { samplingRate: 0, alwaysKeep: false };
      const config2 = service.getConfig();

      // Assert
      // La modificación de config1 no debe afectar la configuración interna
      expect(config2.PAGE_VIEW).toEqual(DEFAULT_THROTTLING_CONFIG.PAGE_VIEW);
    });
  });
});
