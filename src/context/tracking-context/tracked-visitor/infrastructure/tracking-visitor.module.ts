import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { TRACKING_VISITOR_REPOSITORY } from '../domain/tracking-visitor.repository';
import { TrackingVisitorService } from './tracking-visitor.service';
import { NewTrackingVisitorOnVisitorAccountCreate } from '../application/create/new-tracking-visitor-on-visitor-account-create';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingVisitorEntity])],
  providers: [
    { provide: TRACKING_VISITOR_REPOSITORY, useClass: TrackingVisitorService },

    // Event handlers
    NewTrackingVisitorOnVisitorAccountCreate,
  ],
})
export class TrackingVisitorModule {}
