import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatModule } from 'src/context/conversations/features/chat/infrastructure/chat.module';
import { RealTimeWebSocketGateway } from './features/real-time-connection/infrastructure/websocket.gateway';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';
import { CONNECTION_REPOSITORY } from './features/real-time-connection/domain/connection.repository';
import { InMemoryConnectionService } from './features/real-time-connection/infrastructure/in-memory-connection.service';
import { ConnectUserCommandHandler } from './features/real-time-connection/application/command/connect/connect-user.command-handler';
import { DisconnectUserCommandHandler } from './features/real-time-connection/application/command/disconnect/disconnect-user.command-handler';
import { FindOneUserBySocketIdQueryHandler } from './features/real-time-connection/application/query/find-one/find-one-user-by-socket-id.query-handler';
import { CHAT_MESSAGE_EMITTER } from './features/real-time-connection/domain/message-emitter';
import { WsChatMessageEmitterService } from './features/real-time-connection/infrastructure/services/ws-chat-message-emitter.service';
import { RealTimeMessageSenderCommandHandler } from './features/real-time-connection/application/command/message/real-time-message-sender.command-handler';
import { AssignOnPendingChatEventHandler } from './features/real-time-connection/application/event/assign-on-pending-chat.event-handler';
import { NEW_CHAT_NOTIFICATION } from './features/real-time-connection/domain/new-chat-notification';
import { WsNewChatNotificationService } from './features/real-time-connection/infrastructure/services/ws-new-chat-notification.service';
import { NotifyOnParticipantAssignedToChatEventHandler } from './features/real-time-connection/application/event/notify-on-participant-assigned-to-chat.event-handler';
import { NOTIFICATION } from './features/real-time-connection/domain/notification';
import { WsNotificationService } from './features/real-time-connection/infrastructure/services/ws-notification.service';
import { NotifyOnParticipantOnlineStatusUpdatedEventHandler } from './features/real-time-connection/application/event/notify-on-participant-online-status-updated.event-handler';
import { NotifyOnChatStateUpdatedEventHandler } from './features/real-time-connection/application/event/notify-on-chat-state-updated.event-handler';
import { NotifyOnChatLastMessageUpdatedEventHandler } from './features/real-time-connection/application/event/notify-on-chat-last-message-updated.event-handler';
import { NotifyOnParticipantSeenChatEventHandler } from './features/real-time-connection/application/event/notify-on-participant-seen-chat.event-handler';
import { NotifyOnParticipantUnseenChatEventHandler } from './features/real-time-connection/application/event/notify-on-participant-unseen-chat.event-handler';
import { RecalculateAssignmentOnCommercialConnectedEventHandler } from './features/real-time-connection/application/event/recalculate-assignment-on-commercial-connected.event-handler';
import { RecalculateAssignmentOnCommercialDisconnectedEventHandler } from './features/real-time-connection/application/event/recalculate-assignment-on-commercial-disconnected.event-handler';
import { DetectCommercialDisconnectedEventHandler } from './features/real-time-connection/application/event/detect-commercial-disconnected.event-handler';
import { CommercialAssignmentService } from './features/real-time-connection/domain/commercial-assignment.service';

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