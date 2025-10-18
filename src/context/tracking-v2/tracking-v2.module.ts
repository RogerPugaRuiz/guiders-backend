import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { TrackingV2Controller } from './infrastructure/controllers/tracking-v2.controller';

// Command Handlers
import { IngestTrackingEventsCommandHandler } from './application/commands';

// Query Handlers
import { GetEventStatsByTenantQueryHandler } from './application/queries';

// Services
import { TrackingEventBufferService } from './application/services';
import {
  EventThrottlingDomainService,
  EventAggregationDomainService,
} from './domain/services';

// Infrastructure
import { TRACKING_EVENT_REPOSITORY } from './domain/tracking-event.repository';
import { MongoTrackingEventRepositoryImpl } from './infrastructure/persistence/impl/mongo-tracking-event.repository.impl';
import { PartitionRouterService } from './infrastructure/persistence/services/partition-router.service';
import { TrackingEventMapper } from './infrastructure/persistence/mappers/tracking-event.mapper';

// Schedulers
import { BufferFlushScheduler } from './infrastructure/schedulers/buffer-flush.scheduler';
import { PartitionMaintenanceScheduler } from './infrastructure/schedulers/partition-maintenance.scheduler';

/**
 * Módulo del contexto TrackingV2
 * Gestiona tracking de eventos con batching, throttling, y particionamiento
 */
@Module({
  imports: [
    CqrsModule, // Para CommandBus, QueryBus, EventBus
    MongooseModule.forFeature([]), // Necesario para @InjectConnection en PartitionRouter
    ConfigModule, // Para variables de entorno
  ],
  controllers: [TrackingV2Controller],
  providers: [
    // Repository
    {
      provide: TRACKING_EVENT_REPOSITORY,
      useClass: MongoTrackingEventRepositoryImpl,
    },

    // Command Handlers
    IngestTrackingEventsCommandHandler,

    // Query Handlers
    GetEventStatsByTenantQueryHandler,

    // Application Services
    TrackingEventBufferService,

    // Domain Services
    EventThrottlingDomainService,
    EventAggregationDomainService,

    // Infrastructure Services
    PartitionRouterService,
    TrackingEventMapper,

    // Schedulers
    BufferFlushScheduler,
    PartitionMaintenanceScheduler,
  ],
  exports: [
    // Exportar repository por si otros contextos necesitan acceder
    TRACKING_EVENT_REPOSITORY,
    // Exportar BufferService por si se necesita desde fuera
    TrackingEventBufferService,
  ],
})
export class TrackingV2Module {}
