import { Test, TestingModule } from '@nestjs/testing';
import { GetHealthQueryHandler } from '../get-health.query-handler';
import { GetHealthQuery } from '../../queries/get-health.query';
import { HEALTH_READER_SERVICE } from '../../../health.module';
import { DatabaseStatus } from '../../../domain/value-objects/database-status';
import {
  HealthReaderService,
  HealthData,
} from '../../../domain/services/health-reader.service';

describe('GetHealthQueryHandler', () => {
  let handler: GetHealthQueryHandler;
  let healthReaderService: jest.Mocked<HealthReaderService>;

  const createHealthData = (
    overrides: Partial<HealthData> = {},
  ): HealthData => ({
    version: '1.0.0',
    nodeVersion: 'v20.0.0',
    timestamp: new Date().toISOString(),
    uptime: 100,
    databases: [],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetHealthQueryHandler,
        {
          provide: HEALTH_READER_SERVICE,
          useValue: {
            getHealthData: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<GetHealthQueryHandler>(GetHealthQueryHandler);
    healthReaderService = module.get(HEALTH_READER_SERVICE);
  });

  describe('execute', () => {
    it('debe retornar estado healthy cuando todas las DBs están conectadas', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.connected('postgres', 50),
          DatabaseStatus.connected('mongodb', 30),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.status).toBe('healthy');
      expect(result.databases).toHaveLength(2);
      expect(result.databases[0].status).toBe('connected');
      expect(result.databases[1].status).toBe('connected');
    });

    it('debe retornar estado unhealthy cuando alguna DB está desconectada', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.connected('postgres', 50),
          DatabaseStatus.disconnected('mongodb'),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.status).toBe('unhealthy');
      expect(result.databases[1].status).toBe('disconnected');
    });

    it('debe retornar estado unhealthy cuando postgres está desconectada', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.disconnected('postgres'),
          DatabaseStatus.connected('mongodb', 30),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.status).toBe('unhealthy');
    });

    it('debe retornar estado degraded cuando alguna DB está degraded', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.connected('postgres', 50),
          DatabaseStatus.degraded('mongodb', 1500),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.status).toBe('degraded');
      expect(result.databases[1].status).toBe('degraded');
    });

    it('debe priorizar unhealthy sobre degraded', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.degraded('postgres', 2000),
          DatabaseStatus.disconnected('mongodb'),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.status).toBe('unhealthy');
    });

    it('debe incluir nodeVersion en la respuesta', async () => {
      const nodeVersion = 'v20.0.0';
      const healthData = createHealthData({ nodeVersion });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.nodeVersion).toBe(nodeVersion);
    });

    it('debe incluir timestamp en la respuesta', async () => {
      const timestamp = new Date().toISOString();
      const healthData = createHealthData({ timestamp });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.timestamp).toBe(timestamp);
    });

    it('debe incluir version en la respuesta', async () => {
      const version = '2.5.0';
      const healthData = createHealthData({ version });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.version).toBe(version);
    });

    it('debe incluir uptime en la respuesta', async () => {
      const uptime = 3600;
      const healthData = createHealthData({ uptime });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.uptime).toBe(uptime);
    });

    it('debe mapear correctamente databases a primitivos', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.connected('postgres', 75),
          DatabaseStatus.degraded('mongodb', 1200),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.databases[0]).toEqual({
        type: 'postgres',
        status: 'connected',
        latencyMs: 75,
      });
      expect(result.databases[1]).toEqual({
        type: 'mongodb',
        status: 'degraded',
        latencyMs: 1200,
      });
    });

    it('debe retornar latencyMs null cuando DB está desconectada', async () => {
      const healthData = createHealthData({
        databases: [DatabaseStatus.disconnected('postgres')],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.databases[0].latencyMs).toBeNull();
    });

    it('debe manejar múltiples DBs desconectadas retornando unhealthy', async () => {
      const healthData = createHealthData({
        databases: [
          DatabaseStatus.disconnected('postgres'),
          DatabaseStatus.disconnected('mongodb'),
        ],
      });
      healthReaderService.getHealthData.mockResolvedValue(healthData);

      const query = new GetHealthQuery();
      const result = await handler.execute(query);

      expect(result.status).toBe('unhealthy');
      expect(result.databases.every((db) => db.status === 'disconnected')).toBe(
        true,
      );
    });
  });
});
