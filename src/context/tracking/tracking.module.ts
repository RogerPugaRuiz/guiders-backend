import { Module } from '@nestjs/common';
import { CreateTrackingEventCommandHandler } from './features/tracking-events/application/commands/create-tracking-event-command.handler';
import { TRACKING_EVENT_REPOSITORY } from './features/tracking-events/domain/tracking-event.repository';
import { TypeOrmTrackingEventAdapter } from './features/tracking-events/infrastructure/persistence/type-orm-tracking-event.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingEventTypeOrmEntity } from './features/tracking-events/infrastructure/persistence/entity/tracking-event.typeorm.entity';
import { INTENT_DETECTOR_REPOSITORY } from './features/tracking-events/domain/intent-detector.repository';
import { VisitorIntentRepositoryImpl } from './features/tracking-events/infrastructure/persistence/impl/visitor-intent.repository.impl';
import { VisitorIntentEntity } from './features/tracking-events/infrastructure/persistence/entity/visitor-intent.entity';

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
  exports: [visitorIntentRepositoryProvider],
})
export class TrackingModule {}
