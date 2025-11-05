import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import {
  VisitorV2MongoEntity,
  VisitorV2MongoEntitySchema,
} from './infrastructure/persistence/entity/visitor-v2-mongo.entity';
import { VisitorV2Controller } from './infrastructure/controllers/visitor-v2.controller';
import { SitesController } from './infrastructure/controllers/sites.controller';
import { SiteVisitorsController } from './infrastructure/controllers/site-visitors.controller';
import { TenantVisitorsController } from './infrastructure/controllers/tenant-visitors.controller';
import { IdentifyVisitorCommandHandler } from './application/commands/identify-visitor.command-handler';
import { UpdateSessionHeartbeatCommandHandler } from './application/commands/update-session-heartbeat.command-handler';
import { EndSessionCommandHandler } from './application/commands/end-session.command-handler';
import { ResolveSiteCommandHandler } from './application/commands/resolve-site.command-handler';
import { CleanExpiredSessionsCommandHandler } from './application/commands/clean-expired-sessions.command-handler';
import { VisitorV2MongoRepositoryImpl } from './infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';
import { VISITOR_V2_REPOSITORY } from './domain/visitor-v2.repository';
import { CompanyModule } from '../company/company.module';
import { AuthVisitorModule } from '../auth/auth-visitor/infrastructure/auth-visitor.module';
import { ConversationsV2Module } from '../conversations-v2/conversations-v2.module';
import { GoOnlineVisitorCommandHandler } from './application/commands/go-online-visitor.command-handler';
import { StartChattingVisitorCommandHandler } from './application/commands/start-chatting-visitor.command-handler';
import { GoOfflineVisitorCommandHandler } from './application/commands/go-offline-visitor.command-handler';
import { ChangeVisitorConnectionStatusCommandHandler } from './application/commands/change-visitor-connection-status.command-handler';
import { GetOnlineVisitorsQueryHandler } from './application/queries/get-online-visitors.query-handler';
import { GetChattingVisitorsQueryHandler } from './application/queries/get-chatting-visitors.query-handler';
import { GetVisitorConnectionStatusQueryHandler } from './application/queries/get-visitor-connection-status.query-handler';
import { GetVisitorsBySiteQueryHandler } from './application/queries/get-visitors-by-site.query-handler';
import { GetVisitorsWithUnassignedChatsBySiteQueryHandler } from './application/queries/get-visitors-with-unassigned-chats-by-site.query-handler';
import { GetVisitorsWithQueuedChatsBySiteQueryHandler } from './application/queries/get-visitors-with-queued-chats-by-site.query-handler';
import { GetVisitorsByTenantQueryHandler } from './application/queries/get-visitors-by-tenant.query-handler';
import { GetVisitorsWithUnassignedChatsByTenantQueryHandler } from './application/queries/get-visitors-with-unassigned-chats-by-tenant.query-handler';
import { GetVisitorsWithQueuedChatsByTenantQueryHandler } from './application/queries/get-visitors-with-queued-chats-by-tenant.query-handler';
import { SyncConnectionOnVisitorConnectionChangedEventHandler } from './application/events/visitor-connection-changed.event-handler';
import { EmitPresenceChangedOnVisitorConnectionChangedEventHandler } from './application/events/emit-presence-changed-on-visitor-connection-changed.event-handler';
import { ChangeVisitorToOfflineOnSessionEndedEventHandler } from './application/events/change-visitor-to-offline-on-session-ended.event-handler';
import { VISITOR_CONNECTION_DOMAIN_SERVICE } from './domain/visitor-connection.domain-service';
import { VISITOR_CONNECTION_SERVICE_PROVIDER } from './infrastructure/connection/redis-visitor-connection.domain-service';
import { SessionCleanupScheduler } from './application/services/session-cleanup.scheduler';
import { VisitorInactivityScheduler } from './infrastructure/schedulers/inactivity.scheduler';
import { SESSION_MANAGEMENT_SERVICE_PROVIDER } from './infrastructure/providers/session-management.provider';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';
import { BffSessionAuthService } from '../shared/infrastructure/services/bff-session-auth.service';
import { VisitorSessionAuthService } from '../shared/infrastructure/services/visitor-session-auth.service';
import { ConsentModule } from '../consent/consent.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VisitorV2MongoEntity.name, schema: VisitorV2MongoEntitySchema },
    ]),
    CqrsModule,
    HttpModule, // Para TokenVerifyService
    JwtModule.register({}), // Para TokenVerifyService
    ConfigModule, // Para TokenVerifyService
    CompanyModule,
    AuthVisitorModule,
    ConsentModule, // ← Importar para que RecordConsentCommand esté disponible
    forwardRef(() => ConversationsV2Module),
  ],
  controllers: [
    VisitorV2Controller,
    SitesController,
    SiteVisitorsController,
    TenantVisitorsController,
  ],
  providers: [
    {
      provide: VISITOR_V2_REPOSITORY,
      useClass: VisitorV2MongoRepositoryImpl,
    },
    IdentifyVisitorCommandHandler,
    UpdateSessionHeartbeatCommandHandler,
    EndSessionCommandHandler,
    ResolveSiteCommandHandler,
    CleanExpiredSessionsCommandHandler,
    GoOnlineVisitorCommandHandler,
    StartChattingVisitorCommandHandler,
    GoOfflineVisitorCommandHandler,
    ChangeVisitorConnectionStatusCommandHandler,
    GetOnlineVisitorsQueryHandler,
    GetChattingVisitorsQueryHandler,
    GetVisitorConnectionStatusQueryHandler,
    GetVisitorsBySiteQueryHandler,
    GetVisitorsWithUnassignedChatsBySiteQueryHandler,
    GetVisitorsWithQueuedChatsBySiteQueryHandler,
    GetVisitorsByTenantQueryHandler,
    GetVisitorsWithUnassignedChatsByTenantQueryHandler,
    GetVisitorsWithQueuedChatsByTenantQueryHandler,
    SyncConnectionOnVisitorConnectionChangedEventHandler,
    EmitPresenceChangedOnVisitorConnectionChangedEventHandler,
    ChangeVisitorToOfflineOnSessionEndedEventHandler,
    VISITOR_CONNECTION_SERVICE_PROVIDER,
    SESSION_MANAGEMENT_SERVICE_PROVIDER,
    SessionCleanupScheduler,
    VisitorInactivityScheduler,
    TokenVerifyService,
    BffSessionAuthService,
    VisitorSessionAuthService,
  ],
  exports: [VISITOR_V2_REPOSITORY, VISITOR_CONNECTION_DOMAIN_SERVICE],
})
export class VisitorsV2Module {}
