import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VISITOR_REPOSITORY } from '../domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './persistence/type-orm-visitor.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorTypeOrmEntity } from './persistence/visitor-typeorm.entity';
import { CreateDefaultVisitorCommandHandler } from '../application/commands/create-default-visitor.command-handler';
import { VisitorController } from './controllers/visitor.controller';
import { GetVisitorByIdQueryHandler } from '../application/queries/get-visitor-by-id.query-handler';
import { UpdateVisitorEmailCommandHandler } from '../application/commands/update-visitor-email-command.handler';
import { UpdateVisitorNameCommandHandler } from '../application/commands/update-visitor-name-command.handler';
import { UpdateVisitorTelCommandHandler } from '../application/commands/update-visitor-tel-command.handler';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { ALIAS_GENERATOR_SERVICE } from '../application/services/alias-generator.service';
import { FakerAliasGeneratorAdapter } from './services/faker-alias-generator.adapter';

// Definimos los manejadores de comandos y eventos
const CommandHandlers = [
  CreateDefaultVisitorCommandHandler,
  UpdateVisitorEmailCommandHandler,
  UpdateVisitorNameCommandHandler,
  UpdateVisitorTelCommandHandler,
];
const EventHandlers = [];
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
