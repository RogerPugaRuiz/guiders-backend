import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VISITOR_REPOSITORY } from './features/visitor-management/domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './features/visitor-management/infrastructure/persistence/type-orm-visitor.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorTypeOrmEntity } from './features/visitor-management/infrastructure/persistence/visitor-typeorm.entity';
import { CreateDefaultVisitorCommandHandler } from './features/visitor-management/application/commands/create-default-visitor.command-handler';
import { OnVisitorAccountCreatedEventHandler } from './features/visitor-management/application/events/on-visitor-account-created.event-handler';
import { VisitorController } from './features/visitor-management/infrastructure/controllers/visitor.controller';
import { GetVisitorByIdQueryHandler } from './features/visitor-management/application/queries/get-visitor-by-id.query-handler';
import { UpdateVisitorCurrentPageCommandHandler } from './features/visitor-management/application/commands/update-visitor-current-page-command.handler';
import { UpdateVisitorEmailCommandHandler } from './features/visitor-management/application/commands/update-visitor-email-command.handler';
import { UpdateVisitorNameCommandHandler } from './features/visitor-management/application/commands/update-visitor-name-command.handler';
import { UpdateVisitorTelCommandHandler } from './features/visitor-management/application/commands/update-visitor-tel-command.handler';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';

// Definimos los manejadores de comandos y eventos
const CommandHandlers = [
  CreateDefaultVisitorCommandHandler,
  UpdateVisitorCurrentPageCommandHandler,
  UpdateVisitorEmailCommandHandler,
  UpdateVisitorNameCommandHandler,
  UpdateVisitorTelCommandHandler,
];
const EventHandlers = [OnVisitorAccountCreatedEventHandler];
const QueryHandlers = [GetVisitorByIdQueryHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitorTypeOrmEntity]),
    CqrsModule,
    HttpModule,
  ],
  providers: [
    { provide: VISITOR_REPOSITORY, useClass: TypeOrmVisitorAdapter },
    TokenVerifyService,
    ...CommandHandlers,
    ...EventHandlers,
    ...QueryHandlers,
  ],
  controllers: [VisitorController],
})
export class VisitorsModule {}