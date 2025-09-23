import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

// Import dependencies from other modules
import { VisitorsV2Module } from '../visitors-v2/visitors-v2.module';

// Controllers
import { ChatV2Controller } from './infrastructure/controllers/chat-v2.controller';
import { MessageV2Controller } from './infrastructure/controllers/message-v2.controller';

// Infrastructure
import {
  ChatSchema,
  ChatSchemaDefinition,
} from './infrastructure/schemas/chat.schema';
import {
  MessageSchema,
  MessageSchemaDefinition,
} from './infrastructure/schemas/message.schema';
import { ChatMapper } from './infrastructure/mappers/chat.mapper';
import { MessageMapper } from './infrastructure/mappers/message.mapper';
import { MongoChatRepositoryImpl } from './infrastructure/persistence/impl/mongo-chat.repository.impl';
import { MongoMessageRepositoryImpl } from './infrastructure/persistence/impl/mongo-message.repository.impl';

// Domain
import { CHAT_V2_REPOSITORY } from './domain/chat.repository';
import { MESSAGE_V2_REPOSITORY } from './domain/message.repository';

// Guards
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import { OptionalAuthGuard } from 'src/context/shared/infrastructure/guards/optional-auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';
import { VisitorSessionAuthService } from 'src/context/shared/infrastructure/services/visitor-session-auth.service';
import { BffSessionAuthService } from 'src/context/shared/infrastructure/services/bff-session-auth.service';

// Command Handlers
import { JoinWaitingRoomCommandHandler } from './application/commands/join-waiting-room.command-handler';
import { ClearVisitorChatsCommandHandler } from './application/commands/clear-visitor-chats.command-handler';
import { CreateChatWithMessageCommandHandler } from './application/commands/create-chat-with-message.command-handler';
import { SendMessageCommandHandler } from './application/commands/send-message.command-handler';

// Query Handlers
import { GetChatsWithFiltersQueryHandler } from './application/queries/get-chats-with-filters.query-handler';
import { GetChatByIdQueryHandler } from './application/queries/get-chat-by-id.query-handler';
import { GetChatMessagesQueryHandler } from './application/queries/get-chat-messages.query-handler';

/**
 * Módulo principal para el contexto Conversations V2
 * Contiene toda la configuración necesaria para la gestión optimizada de chats
 */
@Module({
  imports: [
    CqrsModule, // Para Command/Query handlers
    HttpModule, // Para TokenVerifyService
    VisitorsV2Module, // Para acceso al VisitorV2Repository
    MongooseModule.forFeature([
      { name: ChatSchema.name, schema: ChatSchemaDefinition },
      { name: MessageSchema.name, schema: MessageSchemaDefinition },
    ]),
  ],
  controllers: [ChatV2Controller, MessageV2Controller],
  providers: [
    // Guards
    AuthGuard,
    OptionalAuthGuard,
    RolesGuard,
    TokenVerifyService,

    // Services
    VisitorSessionAuthService,
    BffSessionAuthService,

    // Mappers
    ChatMapper,
    MessageMapper,

    // Repository Implementation
    {
      provide: CHAT_V2_REPOSITORY,
      useClass: MongoChatRepositoryImpl,
    },
    {
      provide: MESSAGE_V2_REPOSITORY,
      useClass: MongoMessageRepositoryImpl,
    },

    // Command Handlers
    JoinWaitingRoomCommandHandler,
    ClearVisitorChatsCommandHandler,
    CreateChatWithMessageCommandHandler,
    SendMessageCommandHandler,
    // AssignChatToCommercialCommandHandler,
    // CloseChatCommandHandler,
    // CreateChatCommandHandler,

    // Query Handlers
    GetChatsWithFiltersQueryHandler,
    GetChatByIdQueryHandler,
    GetChatMessagesQueryHandler,
    // GetChatByIdQueryHandler,
    // GetCommercialChatsQueryHandler,
    // GetVisitorChatsQueryHandler,
    // GetPendingQueueQueryHandler,
    // GetCommercialMetricsQueryHandler,
    // GetResponseTimeStatsQueryHandler,

    // Services
    // ChatV2Service,
    // MetricsService,
  ],
  exports: [
    // TODO: Exportar cuando se implementen
    // CHAT_V2_REPOSITORY,
    // ChatV2Service,
  ],
})
export class ConversationsV2Module {}
