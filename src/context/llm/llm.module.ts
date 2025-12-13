/**
 * Módulo LLM - Integración de Large Language Models
 *
 * Proporciona:
 * - Respuestas automáticas de IA para visitantes
 * - Sugerencias de respuesta para comerciales
 * - Configuración por sitio
 * - Factory pattern para múltiples proveedores
 * - Tool use (function calling) para acceso a la web
 */

import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

// Módulos de dependencias
import { ConversationsV2Module } from '../conversations-v2/conversations-v2.module';
import { VisitorsV2Module } from '../visitors-v2/visitors-v2.module';
import { CompanyModule } from '../company/company.module';

// Domain
import { LLM_PROVIDER_SERVICE } from './domain/services/llm-provider.service';
import { LLM_CONTEXT_BUILDER_SERVICE } from './domain/services/llm-context-builder.service';
import { TOOL_EXECUTOR_SERVICE } from './domain/services/tool-executor.service';
import { LLM_CONFIG_REPOSITORY } from './domain/llm-config.repository';
import { WEB_CONTENT_CACHE_REPOSITORY } from './domain/web-content-cache.repository';

// Infrastructure - Providers
import { GroqLlmProviderServiceProvider } from './infrastructure/providers/groq-llm-provider.service';

// Infrastructure - Services
import { LlmContextBuilderServiceImpl } from './infrastructure/services/llm-context-builder.service.impl';
import { WebContentFetcherService } from './infrastructure/services/web-content-fetcher.service';
import { ToolExecutorServiceProvider } from './infrastructure/services/tool-executor.service.impl';

// Infrastructure - Persistence
import { MongoLlmConfigRepositoryProvider } from './infrastructure/persistence/mongo-llm-config.repository.impl';
import { MongoWebContentCacheRepositoryProvider } from './infrastructure/persistence/mongo-web-content-cache.repository.impl';
import {
  LlmCompanyConfigSchema,
  LlmCompanyConfigSchemaDefinition,
} from './infrastructure/schemas/llm-company-config.schema';
import {
  WebContentCacheSchema,
  WebContentCacheSchemaDefinition,
} from './infrastructure/schemas/web-content-cache.schema';

// Infrastructure - Controllers
import { LlmConfigController } from './infrastructure/controllers/llm-config.controller';
import { LlmSuggestionsController } from './infrastructure/controllers/llm-suggestions.controller';

// Application - Command Handlers
import { GenerateAIResponseCommandHandler } from './application/commands/generate-ai-response.command-handler';
import { GenerateSuggestionCommandHandler } from './application/commands/generate-suggestion.command-handler';
import { ImproveTextCommandHandler } from './application/commands/improve-text.command-handler';

// Application - Event Handlers
import { SendAIResponseOnMessageSentEventHandler } from './application/events/send-ai-response-on-message-sent.event-handler';

// Guards y Auth (importados de shared)
import { DualAuthGuard } from '../shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from '../shared/infrastructure/guards/role.guard';
import { TokenVerifyService } from '../shared/infrastructure/token-verify.service';
import { BffSessionAuthService } from '../shared/infrastructure/services/bff-session-auth.service';

// Command Handlers
const CommandHandlers = [
  GenerateAIResponseCommandHandler,
  GenerateSuggestionCommandHandler,
  ImproveTextCommandHandler,
];

// Event Handlers
const EventHandlers = [SendAIResponseOnMessageSentEventHandler];

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    HttpModule,
    MongooseModule.forFeature([
      {
        name: LlmCompanyConfigSchema.name,
        schema: LlmCompanyConfigSchemaDefinition,
      },
      {
        name: WebContentCacheSchema.name,
        schema: WebContentCacheSchemaDefinition,
      },
    ]),
    // Dependencias circulares con forwardRef
    forwardRef(() => ConversationsV2Module),
    forwardRef(() => VisitorsV2Module),
    forwardRef(() => CompanyModule),
  ],
  controllers: [LlmConfigController, LlmSuggestionsController],
  providers: [
    // Guards y Auth
    DualAuthGuard,
    RolesGuard,
    TokenVerifyService,
    BffSessionAuthService,

    // LLM Provider (Groq por defecto)
    GroqLlmProviderServiceProvider,

    // Context Builder
    {
      provide: LLM_CONTEXT_BUILDER_SERVICE,
      useClass: LlmContextBuilderServiceImpl,
    },

    // Tool Executor (para function calling)
    WebContentFetcherService,
    ToolExecutorServiceProvider,

    // Config Repository
    MongoLlmConfigRepositoryProvider,

    // Web Content Cache Repository
    MongoWebContentCacheRepositoryProvider,

    // Command Handlers
    ...CommandHandlers,

    // Event Handlers
    ...EventHandlers,
  ],
  exports: [
    LLM_PROVIDER_SERVICE,
    LLM_CONTEXT_BUILDER_SERVICE,
    TOOL_EXECUTOR_SERVICE,
    LLM_CONFIG_REPOSITORY,
    WEB_CONTENT_CACHE_REPOSITORY,
  ],
})
export class LlmModule {}
