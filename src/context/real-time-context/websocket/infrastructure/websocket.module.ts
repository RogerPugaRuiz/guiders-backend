import { Module } from '@nestjs/common';
import { RealTimeWebSocketGateway } from './websocket.gateway';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { CONNECTION_REPOSITORY } from '../domain/connection.repository';
import { InMemoryConnectionService } from './in-memory-connection.service';
import { ConnectUseCase } from '../application/usecases/connect.usecase';
import { DisconnectUseCase } from '../application/usecases/disconnect.usecase';
import { GetSocketByUserUseCase } from '../application/usecases/get-socket-by-user';
import { GetCommercialSocketUseCase } from '../application/usecases/get-comercial-sockets';
import { SendChatOnNewChatEventHandler } from '../application/handler/send-chat-on-new-chat.event-handler';
import { SEND_NEW_CHAT_REAL_TIME_PORT } from '../application/services/send-new-chat-real-time-port';
import { WsSendNewChatService } from './services/ws-send-new-chat.service';

@Module({
  imports: [HttpModule],
  providers: [
    RealTimeWebSocketGateway,
    TokenVerifyService,
    { provide: CONNECTION_REPOSITORY, useClass: InMemoryConnectionService },
    { provide: SEND_NEW_CHAT_REAL_TIME_PORT, useClass: WsSendNewChatService },
    // usecases
    ConnectUseCase,
    DisconnectUseCase,
    GetSocketByUserUseCase,
    GetCommercialSocketUseCase,

    // handlers
    SendChatOnNewChatEventHandler,
  ],
})
export class WebsocketModule {}
