import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WebSocketGatewayBasic } from './websocket.gateway';
import { TokenVerifyService } from '../context/shared/infrastructure/token-verify.service';

@Module({
  imports: [JwtModule.register({}), HttpModule, ConfigModule],
  providers: [WebSocketGatewayBasic, TokenVerifyService],
  exports: [WebSocketGatewayBasic],
})
export class WebSocketModule {}
