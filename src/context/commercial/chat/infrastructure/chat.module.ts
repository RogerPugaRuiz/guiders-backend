import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ChatGateway, TokenVerifyService, TokenVerifyService],
})
export class ChatModule {}
