import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHealthQuery } from '../queries/get-health.query';
import { HealthReaderService } from '../../domain/services/health-reader.service';
import { HealthResponseDto } from '../dtos/health-response.dto';

@QueryHandler(GetHealthQuery)
export class GetHealthQueryHandler implements IQueryHandler<GetHealthQuery> {
  constructor(
    @Inject('HEALTH_READER_SERVICE')
    private readonly healthReaderService: HealthReaderService,
  ) {}

  async execute(_query: GetHealthQuery): Promise<HealthResponseDto> {
    const healthData = await this.healthReaderService.getHealthData();

    const hasDisconnected = healthData.databases.some((db) =>
      db.isDisconnected(),
    );
    const hasDegraded = healthData.databases.some((db) => db.isDegraded());

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasDisconnected) {
      status = 'unhealthy';
    } else if (hasDegraded) {
      status = 'degraded';
    }

    return {
      version: healthData.version,
      nodeVersion: healthData.nodeVersion,
      timestamp: healthData.timestamp,
      uptime: healthData.uptime,
      status,
      databases: healthData.databases.map((db) => db.toPrimitives()),
    };
  }
}
