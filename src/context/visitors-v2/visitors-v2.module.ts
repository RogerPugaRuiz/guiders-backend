import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import {
  VisitorV2MongoEntity,
  VisitorV2MongoEntitySchema,
} from './infrastructure/persistence/entity/visitor-v2-mongo.entity';
import { VisitorV2Controller } from './infrastructure/controllers/visitor-v2.controller';
import { IdentifyVisitorCommandHandler } from './application/commands/identify-visitor.command-handler';
import { VisitorV2MongoRepositoryImpl } from './infrastructure/persistence/impl/visitor-v2-mongo.repository.impl';
import { VISITOR_V2_REPOSITORY } from './domain/visitor-v2.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VisitorV2MongoEntity.name, schema: VisitorV2MongoEntitySchema },
    ]),
    CqrsModule,
  ],
  controllers: [VisitorV2Controller],
  providers: [
    {
      provide: VISITOR_V2_REPOSITORY,
      useClass: VisitorV2MongoRepositoryImpl,
    },
    IdentifyVisitorCommandHandler,
  ],
  exports: [VISITOR_V2_REPOSITORY],
})
export class VisitorsV2Module {}
