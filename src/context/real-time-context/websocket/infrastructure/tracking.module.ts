import { Module } from '@nestjs/common';
import { RealTimeWebSocketGateway } from './websocket.gateway';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { ConnectUserToSocketUseCase } from '../application/connect-user-to-socket.usecase';
import { CONNECTION_REPOSITORY } from '../domain/connection.repository';
import { InMemoryConnectionService } from './in-memory-connection.service';
import { DisconnectUserToSocketUseCase } from '../application/disconnect-user-to-socket.usecase';

@Module({
  imports: [HttpModule],
  providers: [
    RealTimeWebSocketGateway,
    TokenVerifyService,
    { provide: CONNECTION_REPOSITORY, useClass: InMemoryConnectionService },
    // usecases
    ConnectUserToSocketUseCase,
    DisconnectUserToSocketUseCase,
  ],
})
export class TrackingModule {}
