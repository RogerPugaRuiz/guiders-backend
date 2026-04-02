import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PostgresHealthService } from './infrastructure/persistence/postgres-health.service';
import { MongoHealthService } from './infrastructure/persistence/mongo-health.service';
import { HealthReaderServiceImpl } from './infrastructure/services/health-reader.service.impl';
import { HealthController } from './infrastructure/controllers/health.controller';
import { GetHealthQueryHandler } from './application/handlers/get-health.query-handler';

export const HEALTH_READER_SERVICE = 'HEALTH_READER_SERVICE';

const QueryHandlers = [GetHealthQueryHandler];

@Module({
  imports: [CqrsModule],
  controllers: [HealthController],
  providers: [
    PostgresHealthService,
    MongoHealthService,
    {
      provide: HEALTH_READER_SERVICE,
      useClass: HealthReaderServiceImpl,
    },
    {
      provide: 'HEALTH_READER_SERVICE',
      useExisting: HEALTH_READER_SERVICE,
    },
    ...QueryHandlers,
  ],
  exports: [],
})
export class HealthModule {}
