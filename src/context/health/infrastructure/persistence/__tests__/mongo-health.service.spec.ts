import { Logger } from '@nestjs/common';
import { MongoHealthService } from '../mongo-health.service';
import { HEALTH_CHECK_TIMEOUT_MS } from '../../../domain/constants/health.constants';

describe('MongoHealthService', () => {
  let service: MongoHealthService;
  let mockConnection: any;
  let mockAdmin: any;
  let mockDb: any;
  let mockLoggerError: jest.Mock;
  let mockLoggerWarn: jest.Mock;

  beforeEach(() => {
    mockAdmin = {
      ping: jest.fn(),
    };

    mockDb = {
      admin: jest.fn().mockReturnValue(mockAdmin),
    };

    mockConnection = {
      db: mockDb,
    };

    mockLoggerError = jest.fn();
    mockLoggerWarn = jest.fn();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLoggerError);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLoggerWarn);

    service = new MongoHealthService(mockConnection);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('check', () => {
    it('debe retornar estado connected cuando el ping es exitoso', async () => {
      mockAdmin.ping.mockResolvedValue({ ok: 1 });

      const result = await service.check();

      expect(result.type).toBe('mongodb');
      expect(result.status).toBe('connected');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.latencyMs).toBeLessThan(HEALTH_CHECK_TIMEOUT_MS);
    });

    it('debe retornar estado disconnected cuando connection.db es null', async () => {
      mockConnection.db = null;

      const result = await service.check();

      expect(result.type).toBe('mongodb');
      expect(result.status).toBe('disconnected');
      expect(result.latencyMs).toBeNull();
    });

    it('debe retornar estado disconnected cuando connection.db es undefined', async () => {
      mockConnection.db = undefined;

      const result = await service.check();

      expect(result.type).toBe('mongodb');
      expect(result.status).toBe('disconnected');
    });

    it('debe retornar estado disconnected cuando admin es null', async () => {
      mockDb.admin.mockReturnValue(null);

      const result = await service.check();

      expect(result.type).toBe('mongodb');
      expect(result.status).toBe('disconnected');
    });

    it('debe retornar estado disconnected cuando ping falla', async () => {
      mockAdmin.ping.mockRejectedValue(
        new Error('MongoDB server selection failed'),
      );

      const result = await service.check();

      expect(result.type).toBe('mongodb');
      expect(result.status).toBe('disconnected');
      expect(result.latencyMs).toBeNull();
    });

    it('debe registrar error cuando ping falla', async () => {
      mockAdmin.ping.mockRejectedValue(
        new Error('MongoDB server selection failed'),
      );

      await service.check();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'MongoDB health check failed: MongoDB server selection failed',
      );
    });

    it('debe registrar error cuando connection.db es null', async () => {
      mockConnection.db = null;

      await service.check();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'MongoDB connection has no database',
      );
    });

    it('debe cumplir con el timeout de 3 segundos', async () => {
      let resolvePing: (value: unknown) => void;
      const pingPromise = new Promise((resolve) => {
        resolvePing = resolve;
      });

      mockAdmin.ping.mockImplementation(() => pingPromise);

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
      let resolvePing: (value: unknown) => void;
      const pingPromise = new Promise((resolve) => {
        resolvePing = resolve;
      });

      mockAdmin.ping.mockImplementation(() => pingPromise);

      jest.useFakeTimers();

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS);
      await resultPromise;

      expect(mockLoggerError).toHaveBeenCalledWith(
        'MongoDB health check failed: Timeout',
      );

      jest.useRealTimers();
    });

    it('debe retornar estado degraded cuando latency supera threshold de 1000ms', async () => {
      jest.useFakeTimers();

      const resolver = {
        fn: null as ((value: unknown) => void) | null,
      };
      mockAdmin.ping.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolver.fn = resolve;
          }),
      );

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(1100);
      resolver.fn?.({ ok: 1 });
      const result = await resultPromise;

      expect(result.status).toBe('degraded');
      expect(result.latencyMs).toBeGreaterThanOrEqual(1000);

      jest.useRealTimers();
    });

    it('debe registrar warning cuando latency está degraded', async () => {
      jest.useFakeTimers();

      const resolver = {
        fn: null as ((value: unknown) => void) | null,
      };
      mockAdmin.ping.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolver.fn = resolve;
          }),
      );

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(1500);
      resolver.fn?.({ ok: 1 });
      await resultPromise;

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB latency degraded'),
      );

      jest.useRealTimers();
    });

    it('debe completar antes del timeout cuando el ping es rápido', async () => {
      mockAdmin.ping.mockResolvedValue({ ok: 1 });

      const start = Date.now();
      const result = await service.check();
      const elapsed = Date.now() - start;

      expect(result.status).toBe('connected');
      expect(elapsed).toBeLessThan(500);
    });

    it('debe usar Promise.race para timeout', async () => {
      let resolvePing: (value: unknown) => void;
      const pingPromise = new Promise((resolve) => {
        resolvePing = resolve;
      });

      mockAdmin.ping.mockImplementation(() => pingPromise);

      jest.useFakeTimers();

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS / 2);
      expect(mockAdmin.ping).toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(HEALTH_CHECK_TIMEOUT_MS / 2 + 10);
      const result = await resultPromise;

      expect(result.status).toBe('disconnected');

      jest.useRealTimers();
    });

    it('debe registrar error para errores sin mensaje', async () => {
      mockAdmin.ping.mockRejectedValue({});

      const result = await service.check();

      expect(result.status).toBe('disconnected');
      expect(mockLoggerError).toHaveBeenCalledWith(
        'MongoDB health check failed: Unknown error',
      );
    });

    it('debe medir latency correctamente', async () => {
      jest.useFakeTimers();

      const resolver = {
        fn: null as ((value: unknown) => void) | null,
      };
      mockAdmin.ping.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolver.fn = resolve;
          }),
      );

      const resultPromise = service.check();

      await jest.advanceTimersByTimeAsync(200);
      resolver.fn?.({ ok: 1 });
      const result = await resultPromise;

      expect(result.status).toBe('connected');
      expect(result.latencyMs).toBeGreaterThanOrEqual(200);

      jest.useRealTimers();
    });
  });
});
