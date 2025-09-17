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
  ],
  exports: [VISITOR_V2_REPOSITORY],
})
export class VisitorsV2Module {}
