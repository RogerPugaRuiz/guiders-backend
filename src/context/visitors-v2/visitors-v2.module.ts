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
import {
  VisitorSearchHistory,
  VisitorSearchHistorySchema,
} from './infrastructure/persistence/entity/visitor-search-history.entity';
import {
  VisitorSavedSearch,
  VisitorSavedSearchSchema,
} from './infrastructure/persistence/entity/visitor-saved-search.entity';
import { VisitorV2Controller } from './infrastructure/controllers/visitor-v2.controller';
import { SitesController } from './infrastructure/controllers/sites.controller';
import { SiteVisitorsController } from './infrastructure/controllers/site-visitors.controller';
import { TenantVisitorsController } from './infrastructure/controllers/tenant-visitors.controller';
import { VisitorSearchController } from './infrastructure/controllers/visitor-search.controller';
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
import { GetVisitorCurrentPageQueryHandler } from './application/queries/get-visitor-current-page.query-handler';
import { GetVisitorActivityQueryHandler } from './application/queries/get-visitor-activity.query-handler';
import { GetVisitorSearchSchemaQueryHandler } from './application/queries/get-visitor-search-schema.query';
import { GetVisitorSearchSuggestionsQueryHandler } from './application/queries/get-visitor-search-suggestions.query';
import { ExecuteVisitorSearchQueryHandler } from './application/queries/execute-visitor-search.query';
import { GetVisitorSearchHistoryQueryHandler } from './application/queries/get-visitor-search-history.query';
import { GetVisitorSavedSearchesQueryHandler } from './application/queries/get-visitor-saved-searches.query';
import { CreateSavedSearchCommandHandler } from './application/commands/create-saved-search.command';
import { DeleteSavedSearchCommandHandler } from './application/commands/delete-saved-search.command';
import { VisitorSearchParserService } from './infrastructure/services/visitor-search-parser.service';
import { SyncConnectionOnVisitorConnectionChangedEventHandler } from './application/events/visitor-connection-changed.event-handler';
import { EmitPresenceChangedOnVisitorConnectionChangedEventHandler } from './application/events/emit-presence-changed-on-visitor-connection-changed.event-handler';
import { ChangeVisitorToOfflineOnSessionEndedEventHandler } from './application/events/change-visitor-to-offline-on-session-ended.event-handler';
import { NotifyPageChangedOnVisitorCurrentPageChangedEventHandler } from './application/events/notify-page-changed-on-visitor-current-page-changed.event-handler';
import { NotifyHighIntentOnVisitorBecameHighIntentEventHandler } from './application/events/notify-high-intent-on-visitor-became-high-intent.event-handler';
import { VISITOR_CONNECTION_DOMAIN_SERVICE } from './domain/visitor-connection.domain-service';
import { VISITOR_CONNECTION_SERVICE_PROVIDER } from './infrastructure/connection/redis-visitor-connection.domain-service';
import { SessionCleanupScheduler } from './application/services/session-cleanup.scheduler';
import { SESSION_MANAGEMENT_SERVICE_PROVIDER } from './infrastructure/providers/session-management.provider';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';
import { BffSessionAuthService } from '../shared/infrastructure/services/bff-session-auth.service';
import { VisitorSessionAuthService } from '../shared/infrastructure/services/visitor-session-auth.service';
import { ConsentModule } from '../consent/consent.module';
import { WebSocketModule } from '../../websocket/websocket.module';
import { WebSocketGatewayBasic } from '../../websocket/websocket.gateway';
import { TrackingV2Module } from '../tracking-v2/tracking-v2.module';
import { LeadScoringModule } from '../lead-scoring/lead-scoring.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VisitorV2MongoEntity.name, schema: VisitorV2MongoEntitySchema },
      { name: VisitorSearchHistory.name, schema: VisitorSearchHistorySchema },
      { name: VisitorSavedSearch.name, schema: VisitorSavedSearchSchema },
    ]),
    CqrsModule,
    HttpModule, // Para TokenVerifyService
    JwtModule.register({}), // Para TokenVerifyService
    ConfigModule, // Para TokenVerifyService
    CompanyModule,
    AuthVisitorModule,
    ConsentModule, // ← Importar para que RecordConsentCommand esté disponible
    forwardRef(() => ConversationsV2Module),
    TrackingV2Module,
    WebSocketModule,
    LeadScoringModule,
  ],
  controllers: [
    VisitorV2Controller,
    SitesController,
    SiteVisitorsController,
    TenantVisitorsController,
    VisitorSearchController,
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
    GetVisitorCurrentPageQueryHandler,
    GetVisitorActivityQueryHandler,
    GetVisitorSearchSchemaQueryHandler,
    GetVisitorSearchSuggestionsQueryHandler,
    ExecuteVisitorSearchQueryHandler,
    GetVisitorSearchHistoryQueryHandler,
    GetVisitorSavedSearchesQueryHandler,
    CreateSavedSearchCommandHandler,
    DeleteSavedSearchCommandHandler,
    VisitorSearchParserService,
    SyncConnectionOnVisitorConnectionChangedEventHandler,
    EmitPresenceChangedOnVisitorConnectionChangedEventHandler,
    ChangeVisitorToOfflineOnSessionEndedEventHandler,
    NotifyPageChangedOnVisitorCurrentPageChangedEventHandler,
    NotifyHighIntentOnVisitorBecameHighIntentEventHandler,
    VISITOR_CONNECTION_SERVICE_PROVIDER,
    SESSION_MANAGEMENT_SERVICE_PROVIDER,
    SessionCleanupScheduler,
    TokenVerifyService,
    BffSessionAuthService,
    VisitorSessionAuthService,
    {
      provide: 'WEBSOCKET_GATEWAY',
      useExisting: WebSocketGatewayBasic,
    },
  ],
  exports: [VISITOR_V2_REPOSITORY, VISITOR_CONNECTION_DOMAIN_SERVICE],
})
export class VisitorsV2Module {}
