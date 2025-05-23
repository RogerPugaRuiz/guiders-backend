import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VISITOR_REPOSITORY } from '../domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './persistence/type-orm-visitor.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorTypeOrmEntity } from './persistence/visitor-typeorm.entity';
import { CreateDefaultVisitorCommandHandler } from '../application/commands/create-default-visitor.command-handler';
import { OnVisitorAccountCreatedEventHandler } from '../application/events/on-visitor-account-created.event-handler';
import { VisitorController } from './controllers/visitor.controller';
import { GetVisitorByIdQueryHandler } from '../application/queries/get-visitor-by-id.query-handler';
import { UpdateVisitorCurrentPageCommandHandler } from '../application/commands/update-visitor-current-page-command.handler';
import { UpdateVisitorEmailCommandHandler } from '../application/commands/update-visitor-email-command.handler';
import { UpdateVisitorNameCommandHandler } from '../application/commands/update-visitor-name-command.handler';
import { UpdateVisitorTelCommandHandler } from '../application/commands/update-visitor-tel-command.handler';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';

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
  imports: [TypeOrmModule.forFeature([VisitorTypeOrmEntity]), CqrsModule],
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
