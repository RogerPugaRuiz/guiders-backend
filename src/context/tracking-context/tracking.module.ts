import { Module } from '@nestjs/common';
import { TrackingVisitorModule } from './tracked-visitor/infrastructure/tracking-visitor.module';

@Module({
  imports: [TrackingVisitorModule],
  controllers: [],
  providers: [],
})
export class TrackingModule {}
