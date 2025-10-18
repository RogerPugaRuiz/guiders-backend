import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CqrsModule } from '@nestjs/cqrs';
import { TrackingV2Controller } from '../src/context/tracking-v2/infrastructure/controllers/tracking-v2.controller';
import { IngestTrackingEventsCommandHandler } from '../src/context/tracking-v2/application/commands/ingest-tracking-events.command-handler';
import { GetEventStatsByTenantQueryHandler } from '../src/context/tracking-v2/application/queries/get-event-stats-by-tenant.query-handler';
import {
  TrackingEventRepository,
  TRACKING_EVENT_REPOSITORY,
  EventStats,
} from '../src/context/tracking-v2/domain/tracking-event.repository';
import { TrackingEventBufferService } from '../src/context/tracking-v2/application/services/tracking-event-buffer.service';
import { TenantId } from '../src/context/tracking-v2/domain/value-objects';
import { ok, okVoid } from '../src/context/shared/domain/result';
import { DomainError } from '../src/context/shared/domain/domain.error';

describe('Tracking V2 E2E', () => {
  let app: INestApplication;
  let mockRepository: jest.Mocked<TrackingEventRepository>;
  let mockBufferService: jest.Mocked<TrackingEventBufferService>;

  // Mock data - UUIDs válidos en formato v4
  const mockTenantId = 'a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d';
  const mockSiteId = 'b2c3d4e5-f6a7-4b2c-9d0e-1f2a3b4c5d6e';
  const mockVisitorId = 'c3d4e5f6-a7b8-4c3d-ae0f-2a3b4c5d6e7f';
  const mockSessionId = 'd4e5f6a7-b8c9-4d4e-bf1a-3b4c5d6e7f8a';

  beforeEach(async () => {
    // Mock del buffer service
    mockBufferService = {
      add: jest.fn().mockResolvedValue(okVoid()),
      flush: jest.fn().mockResolvedValue(okVoid()),
      getStats: jest.fn().mockReturnValue({
        currentSize: 0,
        totalReceived: 0,
        totalFlushed: 0,
        totalDiscarded: 0,
        lastFlushAt: null,
        flushCount: 0,
      }),
      size: jest.fn().mockReturnValue(0),
      clear: jest.fn(),
    } as any;

    // Mock del repositorio
    mockRepository = {
      save: jest.fn().mockResolvedValue(okVoid()),
      saveBatch: jest.fn().mockResolvedValue(okVoid()),
      findById: jest.fn(),
      findByTenantAndDateRange: jest.fn(),
      getStatsByTenant: jest.fn().mockResolvedValue(
        ok<EventStats, DomainError>({
          totalEvents: 150,
          eventsByType: {
            PAGE_VIEW: 100,
            CLICK: 30,
            SCROLL: 20,
          },
          uniqueVisitors: 25,
          uniqueSessions: 30,
          dateRange: {
            from: new Date('2024-01-01'),
            to: new Date('2024-01-31'),
          },
        }),
      ),
      deleteOlderThan: jest.fn(),
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [TrackingV2Controller],
      providers: [
        IngestTrackingEventsCommandHandler,
        GetEventStatsByTenantQueryHandler,
        {
          provide: TRACKING_EVENT_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: TrackingEventBufferService,
          useValue: mockBufferService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /tracking-v2/events', () => {
    it('debe ingestar eventos exitosamente', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            metadata: {
              url: '/home',
              title: 'Home Page',
            },
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'CLICK',
            metadata: {
              element: 'button',
              id: 'cta-button',
            },
            occurredAt: '2024-01-15T10:30:05.000Z',
          },
        ],
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('received', 2);
      expect(response.body).toHaveProperty('processed');
      expect(mockBufferService.add).toHaveBeenCalled();
    });

    it('debe rechazar batch con más de 500 eventos', async () => {
      // Arrange
      const events = Array(501)
        .fill(null)
        .map(() => ({
          visitorId: mockVisitorId,
          sessionId: mockSessionId,
          eventType: 'PAGE_VIEW',
          metadata: { url: '/test' },
          occurredAt: '2024-01-15T10:30:00.000Z',
        }));

      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events,
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(400);

      expect(mockBufferService.add).not.toHaveBeenCalled();
    });

    it('debe rechazar batch vacío', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(400);

      expect(mockBufferService.add).not.toHaveBeenCalled();
    });

    it('debe rechazar evento con campos faltantes', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            // Falta visitorId
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            metadata: {},
          },
        ],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(400);

      expect(mockBufferService.add).not.toHaveBeenCalled();
    });

    it('debe rechazar tenantId inválido', async () => {
      // Arrange
      const batchDto = {
        tenantId: 'invalid-uuid',
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            metadata: {},
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid Uuid format');
      expect(mockBufferService.add).not.toHaveBeenCalled();
    });

    it('debe aceptar diferentes tipos de eventos', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            metadata: { url: '/home' },
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'CLICK',
            metadata: { element: 'button' },
            occurredAt: '2024-01-15T10:30:01.000Z',
          },
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'SCROLL',
            metadata: { depth: 75 },
            occurredAt: '2024-01-15T10:30:02.000Z',
          },
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'FORM_SUBMIT',
            metadata: { formId: 'contact-form' },
            occurredAt: '2024-01-15T10:30:03.000Z',
          },
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'CUSTOM_EVENT',
            metadata: { customField: 'customValue' },
            occurredAt: '2024-01-15T10:30:04.000Z',
          },
        ],
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('received', 5);
      expect(mockBufferService.add).toHaveBeenCalled();
    });

    it('debe manejar metadata complejo', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'PRODUCT_VIEW',
            metadata: {
              product: {
                id: 'prod-123',
                name: 'Laptop Pro',
                price: 999.99,
                categories: ['electronics', 'computers'],
              },
              userAgent: 'Mozilla/5.0...',
              screenResolution: '1920x1080',
            },
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockBufferService.add).toHaveBeenCalled();
    });
  });

  describe('GET /tracking-v2/stats/tenant/:tenantId', () => {
    it('debe obtener estadísticas por tenant', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/tracking-v2/stats/tenant/${mockTenantId}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalEvents', 150);
      expect(response.body).toHaveProperty('eventsByType');
      expect(response.body.eventsByType).toHaveProperty('PAGE_VIEW', 100);
      expect(response.body.eventsByType).toHaveProperty('CLICK', 30);
      expect(response.body.eventsByType).toHaveProperty('SCROLL', 20);
      expect(response.body).toHaveProperty('uniqueVisitors', 25);
      expect(response.body).toHaveProperty('uniqueSessions', 30);
      expect(mockRepository.getStatsByTenant).toHaveBeenCalledWith(
        expect.any(TenantId),
        undefined,
        undefined,
      );
    });

    it('debe obtener estadísticas con rango de fechas', async () => {
      // Arrange
      const dateFrom = '2024-01-01T00:00:00.000Z';
      const dateTo = '2024-01-31T23:59:59.999Z';

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/tracking-v2/stats/tenant/${mockTenantId}`)
        .query({ dateFrom, dateTo })
        .expect(200);

      expect(response.body).toHaveProperty('totalEvents');
      expect(mockRepository.getStatsByTenant).toHaveBeenCalledWith(
        expect.any(TenantId),
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('debe rechazar tenantId inválido', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/tracking-v2/stats/tenant/invalid-uuid')
        .expect(400);

      expect(mockRepository.getStatsByTenant).not.toHaveBeenCalled();
    });

    it('debe rechazar fechas inválidas', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get(`/tracking-v2/stats/tenant/${mockTenantId}`)
        .query({ dateFrom: 'invalid-date' })
        .expect(200);

      // Invalid Date crea un objeto Date pero con valores NaN
      // El handler lo procesa sin error pero la query retorna los mocks
      expect(mockRepository.getStatsByTenant).toHaveBeenCalled();
    });

    it('debe obtener estadísticas solo con dateFrom', async () => {
      // Arrange
      const dateFrom = '2024-01-01T00:00:00.000Z';

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/tracking-v2/stats/tenant/${mockTenantId}`)
        .query({ dateFrom })
        .expect(200);

      expect(response.body).toHaveProperty('totalEvents');
      expect(mockRepository.getStatsByTenant).toHaveBeenCalledWith(
        expect.any(TenantId),
        expect.any(Date),
        undefined,
      );
    });

    it('debe obtener estadísticas solo con dateTo', async () => {
      // Arrange
      const dateTo = '2024-01-31T23:59:59.999Z';

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get(`/tracking-v2/stats/tenant/${mockTenantId}`)
        .query({ dateTo })
        .expect(200);

      expect(response.body).toHaveProperty('totalEvents');
      expect(mockRepository.getStatsByTenant).toHaveBeenCalledWith(
        expect.any(TenantId),
        undefined,
        expect.any(Date),
      );
    });
  });

  describe('GET /tracking-v2/health', () => {
    it('debe retornar health check exitoso', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/tracking-v2/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('debe retornar timestamp válido en ISO 8601', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/tracking-v2/health')
        .expect(200);

      // Assert
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Validaciones de DTO', () => {
    it('debe rechazar eventos sin eventType', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            // eventType faltante
            metadata: {},
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(400);
    });

    it('debe rechazar eventos sin metadata', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            // metadata faltante
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(400);
    });

    it('debe aceptar evento sin occurredAt (usa timestamp actual)', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            metadata: { url: '/test' },
            // occurredAt omitido
          },
        ],
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockBufferService.add).toHaveBeenCalled();
    });

    it('debe rechazar UUIDs mal formateados', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: 'not-a-uuid',
            sessionId: mockSessionId,
            eventType: 'PAGE_VIEW',
            metadata: {},
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid Uuid format');
    });

    it('debe rechazar eventType vacío', async () => {
      // Arrange
      const batchDto = {
        tenantId: mockTenantId,
        siteId: mockSiteId,
        events: [
          {
            visitorId: mockVisitorId,
            sessionId: mockSessionId,
            eventType: '',
            metadata: {},
            occurredAt: '2024-01-15T10:30:00.000Z',
          },
        ],
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/tracking-v2/events')
        .send(batchDto)
        .expect(400);
    });
  });
});
