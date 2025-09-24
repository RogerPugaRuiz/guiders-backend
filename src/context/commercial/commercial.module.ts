import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';

// Domain
import { COMMERCIAL_CONNECTION_DOMAIN_SERVICE } from './domain/commercial-connection.domain-service';
import { COMMERCIAL_REPOSITORY } from './domain/commercial.repository';

// Application - Queries
import { GetAvailableCommercialsQueryHandler } from './application/queries/get-available-commercials.query-handler';
import { GetOnlineCommercialsQueryHandler } from './application/queries/get-online-commercials.query-handler';
import { GetCommercialConnectionStatusQueryHandler } from './application/queries/get-commercial-connection-status.query-handler';

// Application - Commands
import { ConnectCommercialCommandHandler } from './application/commands/connect-commercial.command-handler';
import { DisconnectCommercialCommandHandler } from './application/commands/disconnect-commercial.command-handler';
import { UpdateCommercialActivityCommandHandler } from './application/commands/update-commercial-activity.command-handler';

// Application - Events
import { CreateApiKeyOnCommercialConnectedEventHandler } from './application/events/create-api-key-on-commercial-connected.event-handler';
import { LogActivityOnCommercialHeartbeatReceivedEventHandler } from './application/events/log-activity-on-commercial-heartbeat-received.event-handler';
import { UpdateMetricsOnCommercialDisconnectedEventHandler } from './application/events/update-metrics-on-commercial-disconnected.event-handler';

// Infrastructure
import { MongoCommercialRepositoryImpl } from './infrastructure/persistence/impl/mongo-commercial.repository.impl';
import { CommercialController } from './infrastructure/controllers/commercial.controller';
import { RedisCommercialConnectionDomainService } from './infrastructure/connection/redis-commercial-connection.domain-service';

// Schema imports
import { CommercialSchemaDefinition } from './infrastructure/persistence/schemas/commercial.schema';

/**
 * Módulo del contexto Commercial
 * Gestiona la funcionalidad de comerciales y su heartbeat
 */
@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([
      { name: 'Commercial', schema: CommercialSchemaDefinition },
    ]),
  ],
  controllers: [CommercialController],
  providers: [
    // Repositories
    {
      provide: COMMERCIAL_REPOSITORY,
      useClass: MongoCommercialRepositoryImpl,
    },

    // Domain Services - Redis implementation para funcionalidad real-time
    {
      provide: COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
      useClass: RedisCommercialConnectionDomainService,
    },

    // Query Handlers
    GetAvailableCommercialsQueryHandler,
    GetOnlineCommercialsQueryHandler,
    GetCommercialConnectionStatusQueryHandler,

    // Command Handlers
    ConnectCommercialCommandHandler,
    DisconnectCommercialCommandHandler,
    UpdateCommercialActivityCommandHandler,

    // Event Handlers
    CreateApiKeyOnCommercialConnectedEventHandler,
    LogActivityOnCommercialHeartbeatReceivedEventHandler,
    UpdateMetricsOnCommercialDisconnectedEventHandler,
  ],
  exports: [COMMERCIAL_REPOSITORY, COMMERCIAL_CONNECTION_DOMAIN_SERVICE],
})
export class CommercialModule {}
