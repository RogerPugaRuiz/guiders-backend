import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { WebSocketGatewayBasic } from './websocket.gateway';
import { TokenVerifyService } from '../context/shared/infrastructure/token-verify.service';
import { VisitorsV2Module } from '../context/visitors-v2/visitors-v2.module';
import { CommercialModule } from '../context/commercial/commercial.module';

@Module({
  imports: [
    JwtModule.register({}),
    HttpModule,
    ConfigModule,
    CqrsModule,
    forwardRef(() => VisitorsV2Module),
    forwardRef(() => CommercialModule),
  ],
  providers: [WebSocketGatewayBasic, TokenVerifyService],
  exports: [WebSocketGatewayBasic],
})
export class WebSocketModule {}
