import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseStatus } from '../../domain/value-objects/database-status';
import { HEALTH_CHECK_TIMEOUT_MS } from '../../domain/constants/health.constants';

const POSTGRES_DEGRADED_THRESHOLD_MS = 1000;

@Injectable()
export class PostgresHealthService {
  private readonly logger = new Logger(PostgresHealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<DatabaseStatus> {
    try {
      const start = Date.now();
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout')),
            HEALTH_CHECK_TIMEOUT_MS,
          ),
        ),
      ]);
      const latencyMs = Date.now() - start;

      if (latencyMs > POSTGRES_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(
          `PostgreSQL latency degraded: ${latencyMs}ms (threshold: ${POSTGRES_DEGRADED_THRESHOLD_MS}ms)`,
        );
        return DatabaseStatus.degraded('postgres', latencyMs);
      }

      return DatabaseStatus.connected('postgres', latencyMs);
    } catch (error) {
      this.logger.error(
        `PostgreSQL health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return DatabaseStatus.disconnected('postgres');
    }
  }
}
