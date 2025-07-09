import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import {
  ChatMongooseEntity,
  ChatMongooseSchema,
} from './persistence/entity/chat-mongoose.mongodb-entity';
import { CHAT_REPOSITORY } from '../domain/chat/chat.repository';
import { MongoChatRepository } from './persistence/impl/mongo-chat.repository.impl';
import { HttpModule } from '@nestjs/axios';
import { MessageModule } from '../../message/infrastructure/message.module';
import { ChatController } from './chat.controller';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { StartChatCommandHandler } from '../application/create/pending/start-chat.command-handler';
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
import { UpdateParticipantNameCommandHandler } from '../application/update/participants/name/update-participant-name.command-handler';
import { ParticipantViewingChatCommandHandler } from '../application/update/participants/viewing-chat/participant-viewing-chat.command-handler';
import { CompanyService } from './services/company/company.service';

// Importaciones para el sistema de claim
import {
  ComercialClaimMongooseEntity,
  ComercialClaimMongooseSchema,
} from './persistence/entity/comercial-claim-mongoose.mongodb-entity';
import { COMERCIAL_CLAIM_REPOSITORY } from '../domain/claim/comercial-claim.repository';
import { MongoComercialClaimRepository } from './persistence/impl/mongo-comercial-claim.repository.impl';
import { ChatClaimController } from './chat-claim.controller';
import { ClaimChatCommandHandler } from '../application/commands/claim-chat/claim-chat.command-handler';
import { ReleaseChatClaimCommandHandler } from '../application/commands/release-chat-claim/release-chat-claim.command-handler';
import { FindAvailableChatsQueryHandler } from '../application/queries/find-available-chats/find-available-chats.query-handler';
import { FindClaimedChatsByComercialQueryHandler } from '../application/queries/find-claimed-chats-by-comercial/find-claimed-chats-by-comercial.query-handler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMongooseEntity.name, schema: ChatMongooseSchema },
      {
        name: ComercialClaimMongooseEntity.name,
        schema: ComercialClaimMongooseSchema,
      },
    ]),
    CqrsModule,
    HttpModule,
    ConfigModule,
    MessageModule, // Importar MessageModule para acceder a MESSAGE_REPOSITORY y CHAT_MESSAGE_ENCRYPTOR
  ],
  controllers: [ChatController, ChatClaimController],
  providers: [
    { provide: CHAT_REPOSITORY, useClass: MongoChatRepository },
    {
      provide: COMERCIAL_CLAIM_REPOSITORY,
      useClass: MongoComercialClaimRepository,
    },
    { provide: USER_FINDER, useClass: UserFinderAdapterService },
    { provide: VISITOR_FINDER, useClass: VisitorFinderAdapterService },
    // usecases

    // commands
    StartChatCommandHandler,
    ParticipantSeenChatCommandHandler,
    ParticipantUnseenChatCommandHandler,
    UpdateParticipantNameCommandHandler,
    ParticipantViewingChatCommandHandler,

    // claim commands
    ClaimChatCommandHandler,
    ReleaseChatClaimCommandHandler,

    // queries
    // MessagePaginateQueryHandler,
    FindOneChatByIdQueryHandler,
    FindChatListByParticipantQueryHandler,
    FindChatListWithFiltersQueryHandler,

    // claim queries
    FindAvailableChatsQueryHandler,
    FindClaimedChatsByComercialQueryHandler,

    // events
    UpdateChatParticipantsOnCommercialsAssignedEventHandler,
    UpdateChatParticipantsOnCommercialsUnassignedEventHandler,
    UpdateParticipantStatusOnConnectedEventHandler,
    UpdateParticipantStatusOnDisconnectedEventHandler,
    SaveMessageCommandHandler,

    // services
    TokenVerifyService,
    CompanyService,
    ChatService,
  ],
  exports: [CHAT_REPOSITORY, COMERCIAL_CLAIM_REPOSITORY],
})
export class ChatModule {}
