import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [TrackingGateway, TokenVerifyService],
})
export class TrackingModule {}
