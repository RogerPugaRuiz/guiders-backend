import { Module } from '@nestjs/common';
import { CreateTrackingEventCommandHandler } from './application/commands/create-tracking-event-command.handler';
import { TRACKING_EVENT_REPOSITORY } from './domain/tracking-event.repository';
import { TypeOrmTrackingEventAdapter } from './infrastructure/persistence/type-orm-tracking-event.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingEventTypeOrmEntity } from './infrastructure/persistence/entity/tracking-event.typeorm.entity';
import { INTENT_DETECTOR_REPOSITORY } from './domain/intent-detector.repository';
import { VisitorIntentRepositoryImpl } from './infrastructure/persistence/impl/visitor-intent.repository.impl';
import { VisitorIntentEntity } from './infrastructure/persistence/entity/visitor-intent.entity';

export const visitorIntentRepositoryProvider = {
  provide: INTENT_DETECTOR_REPOSITORY,
  useClass: VisitorIntentRepositoryImpl,
};

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackingEventTypeOrmEntity, VisitorIntentEntity]),
  ],
  controllers: [],
  providers: [
    CreateTrackingEventCommandHandler,
    {
      provide: TRACKING_EVENT_REPOSITORY,
      useClass: TypeOrmTrackingEventAdapter,
    },
    visitorIntentRepositoryProvider,
    VisitorIntentRepositoryImpl,
  ],
  exports: [TRACKING_EVENT_REPOSITORY, visitorIntentRepositoryProvider],
})
export class TrackingModule {}
