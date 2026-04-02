import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  HealthData,
  HealthReaderService,
} from '../../domain/services/health-reader.service';
import { PostgresHealthService } from '../persistence/postgres-health.service';
import { MongoHealthService } from '../persistence/mongo-health.service';

@Injectable()
export class HealthReaderServiceImpl implements HealthReaderService {
  private readonly logger = new Logger(HealthReaderServiceImpl.name);
  private readonly startTime: number;

  constructor(
    private readonly postgresHealthService: PostgresHealthService,
    private readonly mongoHealthService: MongoHealthService,
  ) {
    this.startTime = Date.now();
  }

  async getHealthData(): Promise<HealthData> {
    const [postgresStatus, mongoStatus] = await Promise.all([
      this.postgresHealthService.check(),
      this.mongoHealthService.check(),
    ]);

    const version = this.getAppVersion();
    const nodeVersion = process.version;
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      version,
      nodeVersion,
      timestamp,
      uptime,
      databases: [postgresStatus, mongoStatus],
    };
  }

  private getAppVersion(): string {
    const envVersion = process.env.APP_VERSION;
    if (envVersion) {
      return envVersion;
    }

    try {
      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
      );
      return packageJson.version || 'unknown';
    } catch (error) {
      this.logger.warn('Could not read version from package.json');
      return 'unknown';
    }
  }
}
