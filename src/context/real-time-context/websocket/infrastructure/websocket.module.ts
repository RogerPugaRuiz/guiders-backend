import { Module } from '@nestjs/common';
import { RealTimeWebSocketGateway } from './websocket.gateway';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { CONNECTION_REPOSITORY } from '../domain/connection.repository';
import { InMemoryConnectionService } from './in-memory-connection.service';
import { ConnectUserCommandHandler } from '../application/command/connect/connect-user.command-handler';
import { DisconnectUserCommandHandler } from '../application/command/disconnect/disconnect-user.command-handler';
import { FindOneUserBySocketIdQueryHandler } from '../application/query/find-one/find-one-user-by-socket-id.query-handler';
import { SendMessageToVisitorCommandHandler } from '../application/command/message/to-visitor/send-message-to-visitor.command-handler';
import { CHAT_MESSAGE_EMITTER } from 'src/context/real-time-context/websocket/domain/message-emitter';
import { WsChatMessageEmitterService } from 'src/context/real-time-context/websocket/infrastructure/services/ws-chat-message-emitter.service';
import { SendMessageToCommercialCommandHandler } from '../application/command/message/to-commercial/send-message-to-commercial.command-handler';

@Module({
  imports: [HttpModule],
  providers: [
    RealTimeWebSocketGateway,
    TokenVerifyService,
    { provide: CONNECTION_REPOSITORY, useClass: InMemoryConnectionService },
    {
      provide: CHAT_MESSAGE_EMITTER,
      useFactory: (socketServer: RealTimeWebSocketGateway) =>
        new WsChatMessageEmitterService(socketServer),
      inject: [RealTimeWebSocketGateway],
    },
    // usecases

    // handlers
    ConnectUserCommandHandler,
    DisconnectUserCommandHandler,
    FindOneUserBySocketIdQueryHandler,

    SendMessageToVisitorCommandHandler,
    SendMessageToCommercialCommandHandler,
  ],
  exports: [],
})
export class WebsocketModule {}
