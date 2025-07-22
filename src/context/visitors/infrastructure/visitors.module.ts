import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VISITOR_REPOSITORY } from '../domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './persistence/type-orm-visitor.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorTypeOrmEntity } from './persistence/visitor-typeorm.entity';
import { CreateDefaultVisitorCommandHandler } from '../application/commands/create-default-visitor.command-handler';
import { OnVisitorAccountCreatedEventHandler } from '../application/events/on-visitor-account-created.event-handler';
import { OnVisitorCreatedUpdateParticipantNameEventHandler } from '../application/events/on-visitor-created-update-participant-name.event-handler';
import { OnVisitorAliasAssignedUpdateParticipantEventHandler } from '../application/events/on-visitor-alias-assigned-update-participant.event-handler';
import { VisitorController } from './controllers/visitor.controller';
import { GetVisitorByIdQueryHandler } from '../application/queries/get-visitor-by-id.query-handler';
import { UpdateVisitorCurrentPageCommandHandler } from '../application/commands/update-visitor-current-page-command.handler';
import { UpdateVisitorConnectionTimeCommandHandler } from '../application/commands/update-visitor-connection-time-command.handler';
import { UpdateVisitorEmailCommandHandler } from '../application/commands/update-visitor-email-command.handler';
import { UpdateVisitorNameCommandHandler } from '../application/commands/update-visitor-name-command.handler';
import { UpdateVisitorTelCommandHandler } from '../application/commands/update-visitor-tel-command.handler';
import { UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler } from '../application/events/update-visitor-current-page-on-tracking-event-created.event-handler';
import { UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler } from '../application/events/update-visitor-connection-time-on-tracking-event-created.event-handler';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { ALIAS_GENERATOR_SERVICE } from '../application/services/alias-generator.service';
import { FakerAliasGeneratorAdapter } from './services/faker-alias-generator.adapter';

// Definimos los manejadores de comandos y eventos
const CommandHandlers = [
  CreateDefaultVisitorCommandHandler,
  UpdateVisitorCurrentPageCommandHandler,
  UpdateVisitorConnectionTimeCommandHandler,
  UpdateVisitorEmailCommandHandler,
  UpdateVisitorNameCommandHandler,
  UpdateVisitorTelCommandHandler,
];
const EventHandlers = [
  OnVisitorAccountCreatedEventHandler,
  OnVisitorCreatedUpdateParticipantNameEventHandler,
  OnVisitorAliasAssignedUpdateParticipantEventHandler,
  UpdateVisitorCurrentPageOnTrackingEventCreatedEventHandler,
  UpdateVisitorConnectionTimeOnTrackingEventCreatedEventHandler,
];
const QueryHandlers = [GetVisitorByIdQueryHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitorTypeOrmEntity]),
    CqrsModule,
    HttpModule,
  ],
  providers: [
    { provide: VISITOR_REPOSITORY, useClass: TypeOrmVisitorAdapter },
    { provide: ALIAS_GENERATOR_SERVICE, useClass: FakerAliasGeneratorAdapter },
    TokenVerifyService,
    ...CommandHandlers,
    ...EventHandlers,
    ...QueryHandlers,
  ],
  controllers: [VisitorController],
})
export class VisitorsModule {}
