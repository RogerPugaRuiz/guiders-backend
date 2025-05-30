import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatEntity } from './chat.entity';
import { CHAT_REPOSITORY } from '../domain/chat/chat.repository';
import { TypeOrmChatService } from './typeORM-chat.service';
import { HttpModule } from '@nestjs/axios';
import { MessageEntity } from '../../message/infrastructure/entities/message.entity';
import { MESSAGE_REPOSITORY } from '../../message/domain/message.repository';
import { TypeOrmMessageService } from '../../message/infrastructure/typeORM-message.service';
import { ChatController } from './chat.controller';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { StartChatCommandHandler } from '../application/create/pending/start-chat.command-handler';
import { ParticipantsEntity } from './participants.entity';
import { ChatService } from './chat.service';
import { FindOneChatByIdQueryHandler } from '../application/read/find-one-chat-by-id.query-handler';
import { USER_FINDER } from '../application/read/get-username-by-id';
import { UpdateChatParticipantsOnCommercialsAssignedEventHandler } from '../application/update/participants/assigne/update-chat-participants-on-commercials-assigned.event-handler';
import { UpdateChatParticipantsOnCommercialsUnassignedEventHandler } from '../application/update/participants/unassigne/update-chat-participants-on-commercials-unassigned.event-handler';
import { FindChatListByParticipantQueryHandler } from '../application/read/find-chat-list-by-participant.query-handler';
import { FindChatListWithFiltersQueryHandler } from '../application/read/find-chat-list-with-filters.query-handler';
import { UpdateParticipantStatusOnConnectedEventHandler } from '../application/update/participants/status/update-participant-status-on-connected.event-handler';
import { UpdateParticipantStatusOnDisconnectedEventHandler } from '../application/update/participants/status/update-participant-status-on-disconnected.event-handler';
import { SaveMessageCommandHandler } from '../application/create/message/save-message.command-handler';
import { UserFinderAdapterService } from './finders/user-finder-adapter.service';
import { VISITOR_FINDER } from '../application/read/visitor-finder';
import { VisitorFinderAdapterService } from './finders/visitor-finder-adapter.service';
import { ParticipantSeenChatCommandHandler } from '../application/update/participants/seen-chat/participant-seen-chat.command-handler';
import { ParticipantUnseenChatCommandHandler } from '../application/update/participants/unseen-chat/participant-unseen-chat.command-handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity, ParticipantsEntity]),
    HttpModule,
  ],
  controllers: [ChatController],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: TypeOrmChatService },
    { provide: MESSAGE_REPOSITORY, useClass: TypeOrmMessageService },
    { provide: USER_FINDER, useClass: UserFinderAdapterService },
    { provide: VISITOR_FINDER, useClass: VisitorFinderAdapterService },
    // usecases

    // commands
    StartChatCommandHandler,
    ParticipantSeenChatCommandHandler,
    ParticipantUnseenChatCommandHandler,

    // queries
    // MessagePaginateQueryHandler,
    FindOneChatByIdQueryHandler,
    FindChatListByParticipantQueryHandler,
    FindChatListWithFiltersQueryHandler,

    // events
    UpdateChatParticipantsOnCommercialsAssignedEventHandler,
    UpdateChatParticipantsOnCommercialsUnassignedEventHandler,
    UpdateParticipantStatusOnConnectedEventHandler,
    UpdateParticipantStatusOnDisconnectedEventHandler,
    SaveMessageCommandHandler,

    // services
    TokenVerifyService,

    ChatService,
  ],
  exports: [CHAT_REPOSITORY],
})
export class ChatModule {}
