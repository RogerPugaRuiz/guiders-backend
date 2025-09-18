import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import {
  VisitorV2MongoEntity,
  VisitorV2MongoEntitySchema,
} from './infrastructure/persistence/entity/visitor-v2-mongo.entity';
import { VisitorV2Controller } from './infrastructure/controllers/visitor-v2.controller';
import { SitesController } from './infrastructure/controllers/sites.controller';
import { IdentifyVisitorCommandHandler } from './application/commands/identify-visitor.command-handler';
import { UpdateSessionHeartbeatCommandHandler } from './application/commands/update-session-heartbeat.command-handler';
import { EndSessionCommandHandler } from './application/commands/end-session.command-handler';
import { ResolveSiteCommandHandler } from './application/commands/resolve-site.command-handler';
import { VisitorV2MongoRepositoryImpl } from './infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';
import { VISITOR_V2_REPOSITORY } from './domain/visitor-v2.repository';
import { CompanyModule } from '../company/company.module';
import { AuthVisitorModule } from '../auth/auth-visitor/infrastructure/auth-visitor.module';
import { GoOnlineVisitorCommandHandler } from './application/commands/go-online-visitor.command-handler';
import { StartChattingVisitorCommandHandler } from './application/commands/start-chatting-visitor.command-handler';
import { GoOfflineVisitorCommandHandler } from './application/commands/go-offline-visitor.command-handler';
import { GetOnlineVisitorsQueryHandler } from './application/queries/get-online-visitors.query-handler';
import { GetChattingVisitorsQueryHandler } from './application/queries/get-chatting-visitors.query-handler';
import { GetVisitorConnectionStatusQueryHandler } from './application/queries/get-visitor-connection-status.query-handler';
import { SyncConnectionOnVisitorConnectionChangedEventHandler } from './application/events/visitor-connection-changed.event-handler';
import { VISITOR_CONNECTION_DOMAIN_SERVICE } from './domain/visitor-connection.domain-service';
import { VISITOR_CONNECTION_SERVICE_PROVIDER } from './infrastructure/connection/redis-visitor-connection.domain-service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VisitorV2MongoEntity.name, schema: VisitorV2MongoEntitySchema },
    ]),
    CqrsModule,
    CompanyModule,
    AuthVisitorModule,
  ],
  controllers: [VisitorV2Controller, SitesController],
  providers: [
    {
      provide: VISITOR_V2_REPOSITORY,
      useClass: VisitorV2MongoRepositoryImpl,
    },
    IdentifyVisitorCommandHandler,
    UpdateSessionHeartbeatCommandHandler,
    EndSessionCommandHandler,
    ResolveSiteCommandHandler,
    GoOnlineVisitorCommandHandler,
    StartChattingVisitorCommandHandler,
    GoOfflineVisitorCommandHandler,
    GetOnlineVisitorsQueryHandler,
    GetChattingVisitorsQueryHandler,
    GetVisitorConnectionStatusQueryHandler,
    SyncConnectionOnVisitorConnectionChangedEventHandler,
    VISITOR_CONNECTION_SERVICE_PROVIDER,
  ],
  exports: [VISITOR_V2_REPOSITORY, VISITOR_CONNECTION_DOMAIN_SERVICE],
})
export class VisitorsV2Module {}
