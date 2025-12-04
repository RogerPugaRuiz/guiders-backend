/**
 * Módulo LLM - Integración de Large Language Models
 *
 * Proporciona:
 * - Respuestas automáticas de IA para visitantes
 * - Sugerencias de respuesta para comerciales
 * - Configuración por sitio
 * - Factory pattern para múltiples proveedores
 */

import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

// Módulos de dependencias
import { ConversationsV2Module } from '../conversations-v2/conversations-v2.module';
import { VisitorsV2Module } from '../visitors-v2/visitors-v2.module';

// Domain
import { LLM_PROVIDER_SERVICE } from './domain/services/llm-provider.service';
import { LLM_CONTEXT_BUILDER_SERVICE } from './domain/services/llm-context-builder.service';
import { LLM_CONFIG_REPOSITORY } from './domain/llm-config.repository';

// Infrastructure - Providers
import {
  GroqLlmProviderService,
  GroqLlmProviderServiceProvider,
} from './infrastructure/providers/groq-llm-provider.service';
import { MockLlmProviderService } from './infrastructure/providers/mock-llm-provider.service';

// Infrastructure - Services
import { LlmContextBuilderServiceImpl } from './infrastructure/services/llm-context-builder.service.impl';

// Infrastructure - Persistence
import {
  MongoLlmConfigRepositoryImpl,
  MongoLlmConfigRepositoryProvider,
} from './infrastructure/persistence/mongo-llm-config.repository.impl';
import {
  LlmSiteConfigSchema,
  LlmSiteConfigSchemaDefinition,
} from './infrastructure/schemas/llm-site-config.schema';

// Infrastructure - Controllers
import { LlmConfigController } from './infrastructure/controllers/llm-config.controller';

// Application - Command Handlers
import { GenerateAIResponseCommandHandler } from './application/commands/generate-ai-response.command-handler';
import { GenerateSuggestionCommandHandler } from './application/commands/generate-suggestion.command-handler';

// Application - Event Handlers
import { SendAIResponseOnMessageSentEventHandler } from './application/events/send-ai-response-on-message-sent.event-handler';

// Guards y Auth (importados de shared)
import { AuthGuard } from '../shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../shared/infrastructure/guards/role.guard';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';

// Command Handlers
const CommandHandlers = [
  GenerateAIResponseCommandHandler,
  GenerateSuggestionCommandHandler,
];

// Event Handlers
const EventHandlers = [SendAIResponseOnMessageSentEventHandler];

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: LlmSiteConfigSchema.name, schema: LlmSiteConfigSchemaDefinition },
    ]),
    // Dependencias circulares con forwardRef
    forwardRef(() => ConversationsV2Module),
    forwardRef(() => VisitorsV2Module),
  ],
  controllers: [LlmConfigController],
  providers: [
    // Guards y Auth
    AuthGuard,
    RolesGuard,
    TokenVerifyService,

    // LLM Provider (Groq por defecto)
    GroqLlmProviderServiceProvider,

    // Context Builder
    {
      provide: LLM_CONTEXT_BUILDER_SERVICE,
      useClass: LlmContextBuilderServiceImpl,
    },

    // Config Repository
    MongoLlmConfigRepositoryProvider,

    // Command Handlers
    ...CommandHandlers,

    // Event Handlers
    ...EventHandlers,
  ],
  exports: [
    LLM_PROVIDER_SERVICE,
    LLM_CONTEXT_BUILDER_SERVICE,
    LLM_CONFIG_REPOSITORY,
  ],
})
export class LlmModule {}
