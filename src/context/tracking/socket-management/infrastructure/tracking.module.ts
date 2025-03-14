import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { UserConnectionService } from './user-connection.service';

@Module({
  imports: [HttpModule],
  providers: [TrackingGateway, TokenVerifyService, UserConnectionService],
})
export class TrackingModule {}
