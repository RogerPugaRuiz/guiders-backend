import { Module } from '@nestjs/common';
import { RealTimeWebSocketGateway } from './websocket.gateway';
import { TokenVerifyService } from '../../shared/infrastructure/token-verify.service';
import { HttpModule } from '@nestjs/axios';
import { CONNECTION_REPOSITORY } from '../domain/connection.repository';
import { InMemoryConnectionService } from './in-memory-connection.service';
import { ConnectUserCommandHandler } from '../application/command/connect/connect-user.command-handler';
import { DisconnectUserCommandHandler } from '../application/command/disconnect/disconnect-user.command-handler';
import { FindOneUserBySocketIdQueryHandler } from '../application/query/find-one/find-one-user-by-socket-id.query-handler';
import { CHAT_MESSAGE_EMITTER } from 'src/context/real-time/domain/message-emitter';
import { WsChatMessageEmitterService } from 'src/context/real-time/infrastructure/services/ws-chat-message-emitter.service';
import { RealTimeMessageSenderCommandHandler } from '../application/command/message/real-time-message-sender.command-handler';
import { AssignOnPendingChatEventHandler } from '../application/event/assign-on-pending-chat.event-handler';
import { NEW_CHAT_NOTIFICATION } from '../domain/new-chat-notification';
import { WsNewChatNotificationService } from './services/ws-new-chat-notification.service';
import { NotifyOnParticipantAssignedToChatEventHandler } from '../application/event/notify-on-participant-assigned-to-chat.event-handler';
import { NOTIFICATION } from '../domain/notification';
import { WsNotificationService } from './services/ws-notification.service';
import { NotifyOnParticipantOnlineStatusUpdatedEventHandler } from '../application/event/notify-on-participant-online-status-updated.event-handler';
import { NotifyOnChatStateUpdatedEventHandler } from '../application/event/notify-on-chat-state-updated.event-handler';
import { NotifyOnChatLastMessageUpdatedEventHandler } from '../application/event/notify-on-chat-last-message-updated.event-handler';
import { NotifyOnParticipantSeenChatEventHandler } from '../application/event/notify-on-participant-seen-chat.event-handler';
import { NotifyOnParticipantUnseenChatEventHandler } from '../application/event/notify-on-participant-unseen-chat.event-handler';
import { RecalculateAssignmentOnCommercialConnectedEventHandler } from '../application/event/recalculate-assignment-on-commercial-connected.event-handler';
import { RecalculateAssignmentOnCommercialDisconnectedEventHandler } from '../application/event/recalculate-assignment-on-commercial-disconnected.event-handler';
import { DetectCommercialDisconnectedEventHandler } from '../application/event/detect-commercial-disconnected.event-handler';
import { CommercialAssignmentService } from '../domain/commercial-assignment.service';
import { ChatModule } from 'src/context/conversations/chat/infrastructure/chat.module';

@Module({
  imports: [HttpModule, ChatModule],
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
    {
      provide: NEW_CHAT_NOTIFICATION,
      useClass: WsNewChatNotificationService,
    },
    { provide: NOTIFICATION, useClass: WsNotificationService },
    // usecases

    // handlers
    ConnectUserCommandHandler,
    DisconnectUserCommandHandler,
    FindOneUserBySocketIdQueryHandler,
    RealTimeMessageSenderCommandHandler,

    // events
    AssignOnPendingChatEventHandler,
    NotifyOnParticipantAssignedToChatEventHandler,
    NotifyOnParticipantOnlineStatusUpdatedEventHandler,
    NotifyOnChatStateUpdatedEventHandler,
    NotifyOnChatLastMessageUpdatedEventHandler,
    NotifyOnParticipantSeenChatEventHandler,
    NotifyOnParticipantUnseenChatEventHandler,
    RecalculateAssignmentOnCommercialConnectedEventHandler,
    RecalculateAssignmentOnCommercialDisconnectedEventHandler,
    DetectCommercialDisconnectedEventHandler,
    CommercialAssignmentService,
  ],
  exports: [],
})
export class WebsocketModule {}
