import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingVisitorEntity } from './tracking-visitor.entity';
import { TRACKING_VISITOR_REPOSITORY } from '../domain/tracking-visitor.repository';
import { TrackingVisitorService } from './tracking-visitor.service';
import { NewTrackingVisitorOnVisitorAccountCreate } from '../application/events/new-tracking-visitor-on-visitor-account-create';
import { FindAllPaginatedByCursorTrackingVisitorQueryHandler } from '../application/find-all/find-all-paginated-by-cursor-tracking-visitor-query.handler';
import { HttpModule } from '@nestjs/axios';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingVisitorEntity]), HttpModule],
  providers: [
    { provide: TRACKING_VISITOR_REPOSITORY, useClass: TrackingVisitorService },

    // Event handlers
    NewTrackingVisitorOnVisitorAccountCreate,

    // Queries
    FindAllPaginatedByCursorTrackingVisitorQueryHandler,

    // Services
    TokenVerifyService,
  ],
})
export class TrackingVisitorModule {}
