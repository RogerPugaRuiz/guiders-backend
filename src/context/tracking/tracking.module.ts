import { Module } from '@nestjs/common';
import { CreateTrackingEventCommandHandler } from './application/commands/create-tracking-event-command.handler';
import { TRACKING_EVENT_REPOSITORY } from './domain/tracking-event.repository';
import { TypeOrmTrackingEventAdapter } from './infrastructure/persistence/type-orm-tracking-event.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingEventTypeOrmEntity } from './infrastructure/persistence/tracking-event.typeorm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingEventTypeOrmEntity])],
  controllers: [],
  providers: [
    // Registro del handler de comando para que NestJS lo detecte y pueda inyectarlo
    CreateTrackingEventCommandHandler,
    {
      provide: TRACKING_EVENT_REPOSITORY,
      useClass: TypeOrmTrackingEventAdapter,
    },
  ],
})
export class TrackingModule {}
