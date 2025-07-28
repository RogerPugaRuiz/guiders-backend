import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';

// Controllers
import { ChatV2Controller } from './infrastructure/controllers/chat-v2.controller';

// Infrastructure
import { ChatSchemaDefinition } from './infrastructure/schemas/chat.schema';

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
    MongooseModule.forFeature([{ name: 'Chat', schema: ChatSchemaDefinition }]),
  ],
  controllers: [ChatV2Controller],
  providers: [
    // Guards
    AuthGuard,
    RolesGuard,
    TokenVerifyService,

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

    // Repository Implementation
    // {
    //   provide: CHAT_V2_REPOSITORY,
    //   useClass: MongoChatRepositoryImpl,
    // },

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
