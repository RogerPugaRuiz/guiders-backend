import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VISITOR_REPOSITORY } from '../domain/visitor.repository';
import { TypeOrmVisitorAdapter } from './persistence/type-orm-visitor.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorTypeOrmEntity } from './persistence/visitor-typeorm.entity';
import { CreateDefaultVisitorCommandHandler } from '../application/commands/create-default-visitor.command-handler';
import { OnVisitorAccountCreatedEventHandler } from '../application/events/on-visitor-account-created.event-handler';

// Definimos los manejadores de comandos y eventos
const CommandHandlers = [CreateDefaultVisitorCommandHandler];
const EventHandlers = [OnVisitorAccountCreatedEventHandler];

@Module({
  imports: [TypeOrmModule.forFeature([VisitorTypeOrmEntity]), CqrsModule],
  providers: [
    { provide: VISITOR_REPOSITORY, useClass: TypeOrmVisitorAdapter },
    ...CommandHandlers,
    ...EventHandlers,
  ],
})
export class VisitorsModule {}
