import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseStatus } from '../../domain/value-objects/database-status';
import { HEALTH_CHECK_TIMEOUT_MS } from '../../domain/constants/health.constants';

const MONGODB_DEGRADED_THRESHOLD_MS = 1000;

@Injectable()
export class MongoHealthService {
  private readonly logger = new Logger(MongoHealthService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check(): Promise<DatabaseStatus> {
    try {
      if (!this.connection.db) {
        this.logger.error('MongoDB connection has no database');
        return DatabaseStatus.disconnected('mongodb');
      }

      const start = Date.now();
      const admin = this.connection.db.admin();
      if (!admin) {
        return DatabaseStatus.disconnected('mongodb');
      }
      await Promise.race([
        admin.ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timeout')),
            HEALTH_CHECK_TIMEOUT_MS,
          ),
        ),
      ]);
      const latencyMs = Date.now() - start;

      if (latencyMs > MONGODB_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(
          `MongoDB latency degraded: ${latencyMs}ms (threshold: ${MONGODB_DEGRADED_THRESHOLD_MS}ms)`,
        );
        return DatabaseStatus.degraded('mongodb', latencyMs);
      }

      return DatabaseStatus.connected('mongodb', latencyMs);
    } catch (error) {
      this.logger.error(
        `MongoDB health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return DatabaseStatus.disconnected('mongodb');
    }
  }
}
