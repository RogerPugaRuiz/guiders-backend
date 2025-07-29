import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

// Controllers
import { ChatV2Controller } from './infrastructure/controllers/chat-v2.controller';
import { MessageV2Controller } from './infrastructure/controllers/message-v2.controller';

// Infrastructure
import {
  ChatSchema,
  ChatSchemaDefinition,
} from './infrastructure/schemas/chat.schema';
import { ChatMapper } from './infrastructure/mappers/chat.mapper';
import { MongoChatRepositoryImpl } from './infrastructure/persistence/impl/mongo-chat.repository.impl';

// Domain
import { CHAT_V2_REPOSITORY } from './domain/chat.repository';

// Guards
import { AuthGuard } from 'src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { TokenVerifyService } from 'src/context/shared/infrastructure/token-verify.service';

/**
 * Módulo principal para el contexto Conversations V2
 * Contiene toda la configuración necesaria para la gestión optimizada de chats
 */
@Module({
  imports: [
    CqrsModule, // Para Command/Query handlers
    HttpModule, // Para TokenVerifyService
    MongooseModule.forFeature([
      { name: ChatSchema.name, schema: ChatSchemaDefinition },
    ]),
  ],
  controllers: [ChatV2Controller, MessageV2Controller],
  providers: [
    // Guards
    AuthGuard,
    RolesGuard,
    TokenVerifyService,

    // Mappers
    ChatMapper,

    // Repository Implementation
    {
      provide: CHAT_V2_REPOSITORY,
      useClass: MongoChatRepositoryImpl,
    },

    // TODO: Agregar cuando se implementen
    // Command Handlers
    // AssignChatToCommercialCommandHandler,
    // CloseChatCommandHandler,
    // CreateChatCommandHandler,

    // Query Handlers
    // GetChatsWithFiltersQueryHandler,
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
