import { Module } from '@nestjs/common';
import { WebSocketGatewayBasic } from './websocket.gateway';

@Module({
  providers: [WebSocketGatewayBasic],
  exports: [WebSocketGatewayBasic],
})
export class WebSocketModule {}
