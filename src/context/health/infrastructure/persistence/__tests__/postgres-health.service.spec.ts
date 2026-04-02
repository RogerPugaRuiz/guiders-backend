import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PostgresHealthService } from '../postgres-health.service';
import { HEALTH_CHECK_TIMEOUT_MS } from '../../../domain/constants/health.constants';

const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();

jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLoggerError);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLoggerWarn);

describe('PostgresHealthService', () => {
  let service: PostgresHealthService;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    service = new PostgresHealthService(mockDataSource);
    mockLoggerError.mockClear();
    mockLoggerWarn.mockClear();
  });

  describe('check', () => {
    it('debe retornar estado connected cuando la query es exitosa', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.check();

      expect(result.type).toBe('postgres');
      expect(result.status).toBe('connected');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.latencyMs).toBeLessThan(HEALTH_CHECK_TIMEOUT_MS);
    });

    it('debe retornar estado disconnected cuando la query falla', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result = await service.check();

      expect(result.type).toBe('postgres');
      expect(result.status).toBe('disconnected');
      expect(result.latencyMs).toBeNull();
    });

    it('debe retornar estado disconnected cuando hay error sin mensaje', async () => {
      mockDataSource.query.mockRejectedValue({});

      const result = await service.check();

      expect(result.type).toBe('postgres');
      expect(result.status).toBe('disconnected');
    });

    it('debe registrar error cuando la query falla', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      await service.check();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'PostgreSQL health check failed: Connection refused',
      );
    });

    it('debe registrar error cuando la query falla con error sin mensaje', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Unknown error'));

      await service.check();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'PostgreSQL health check failed: Unknown error',
      );
    });

    it('debe cumplir con el timeout de 3 segundos', async () => {
      let resolveQuery: (value: unknown) => void;
      const queryPromise = new Promise((resolve) => {
        resolveQuery = resolve;
      });

      mockDataSource.query.mockImplementation(() => queryPromise);

      jest.useFakeTimers();

      const start = Date.now();
      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS);
      const result = await resultPromise;
      const elapsed = Date.now() - start;

      expect(result.status).toBe('disconnected');
      expect(elapsed).toBeGreaterThanOrEqual(HEALTH_CHECK_TIMEOUT_MS - 50);

      jest.useRealTimers();
    });

    it('debe registrar error cuando ocurre timeout', async () => {
      let resolveQuery: (value: unknown) => void;
      const queryPromise = new Promise((resolve) => {
        resolveQuery = resolve;
      });

      mockDataSource.query.mockImplementation(() => queryPromise);

      jest.useFakeTimers();

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS);
      await resultPromise;

      expect(mockLoggerError).toHaveBeenCalledWith(
        'PostgreSQL health check failed: Timeout',
      );

      jest.useRealTimers();
    });

    it('debe retornar estado degraded cuando latency supera threshold de 1000ms', async () => {
      jest.useFakeTimers();

      let resolveQuery!: (value: unknown) => void;
      mockDataSource.query.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve;
          }),
      );

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(1100);
      resolveQuery([{ '?column?': 1 }]);
      const result = await resultPromise;

      expect(result.status).toBe('degraded');
      expect(result.latencyMs).toBeGreaterThanOrEqual(1000);

      jest.useRealTimers();
    });

    it('debe registrar warning cuando latency está degraded', async () => {
      jest.useFakeTimers();

      let resolveQuery!: (value: unknown) => void;
      mockDataSource.query.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve;
          }),
      );

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(1500);
      resolveQuery([{ '?column?': 1 }]);
      await resultPromise;

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('PostgreSQL latency degraded'),
      );

      jest.useRealTimers();
    });

    it('debe completar antes del timeout cuando la query es rápida', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const start = Date.now();
      const result = await service.check();
      const elapsed = Date.now() - start;

      expect(result.status).toBe('connected');
      expect(elapsed).toBeLessThan(500);
    });

    it('debe usar Promise.race para timeout', async () => {
      let resolveQuery!: (value: unknown) => void;
      const queryPromise = new Promise((resolve) => {
        resolveQuery = resolve;
      });

      mockDataSource.query.mockImplementation(() => queryPromise);

      jest.useFakeTimers();

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS / 2);
      expect(mockDataSource.query).toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS / 2 + 10);
      const result = await resultPromise;

      expect(result.status).toBe('disconnected');

      jest.useRealTimers();
    });

    it('debe medir latency correctamente', async () => {
      jest.useFakeTimers();

      let resolveQuery!: (value: unknown) => void;
      mockDataSource.query.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve;
          }),
      );

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(200);
      resolveQuery([{ '?column?': 1 }]);
      const result = await resultPromise;

      expect(result.status).toBe('connected');
      expect(result.latencyMs).toBeGreaterThanOrEqual(200);

      jest.useRealTimers();
    });
  });
});
