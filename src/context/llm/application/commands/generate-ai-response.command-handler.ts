/**
 * Handler para el comando de generar respuesta de IA
 */

import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GenerateAIResponseCommand } from './generate-ai-response.command';
import { AIResponseDto } from '../dtos/ai-response.dto';
import {
  LlmProviderService,
  LLM_PROVIDER_SERVICE,
} from '../../domain/services/llm-provider.service';
import {
  LlmContextBuilderService,
  LLM_CONTEXT_BUILDER_SERVICE,
} from '../../domain/services/llm-context-builder.service';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../../domain/llm-config.repository';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import { Message } from 'src/context/conversations-v2/domain/entities/message.aggregate';
import { LlmSiteConfig } from '../../domain/value-objects/llm-site-config';

@CommandHandler(GenerateAIResponseCommand)
export class GenerateAIResponseCommandHandler
  implements ICommandHandler<GenerateAIResponseCommand>
{
  private readonly logger = new Logger(GenerateAIResponseCommandHandler.name);

  constructor(
    @Inject(LLM_PROVIDER_SERVICE)
    private readonly llmProvider: LlmProviderService,
    @Inject(LLM_CONTEXT_BUILDER_SERVICE)
    private readonly contextBuilder: LlmContextBuilderService,
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: GenerateAIResponseCommand): Promise<AIResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `Generando respuesta IA para chat ${command.chatId}, trigger: ${command.triggerMessageId}`,
    );

    try {
      // 1. Obtener configuración del sitio
      const config = await this.getOrCreateConfig(
        command.siteId,
        command.companyId,
      );

      // 2. Construir contexto para el LLM
      const contextResult = await this.contextBuilder.buildContext({
        chatId: command.chatId,
        visitorId: command.visitorId,
        companyId: command.companyId,
        siteId: command.siteId,
        includeVisitorInfo: true,
        maxHistoryMessages: 20,
        customSystemPrompt: config.customSystemPrompt ?? undefined,
      });

      if (contextResult.isErr()) {
        throw new Error(
          `Error al construir contexto: ${contextResult.error.message}`,
        );
      }

      const context = contextResult.unwrap();

      // 3. Simular delay si está configurado (para parecer más natural)
      if (config.responseDelayMs > 0) {
        await this.delay(config.responseDelayMs);
      }

      // 4. Generar respuesta con el LLM
      const responseResult = await this.llmProvider.generateCompletion({
        systemPrompt: context.getEnrichedSystemPrompt(),
        conversationHistory: context.conversationHistory,
        maxTokens: config.maxResponseTokens,
        temperature: config.temperature,
      });

      if (responseResult.isErr()) {
        throw new Error(
          `Error al generar respuesta: ${responseResult.error.message}`,
        );
      }

      const llmResponse = responseResult.unwrap();
      const totalProcessingTimeMs = Date.now() - startTime;

      // 5. Crear mensaje de IA usando el factory existente
      const aiMessage = Message.createAIMessage({
        chatId: command.chatId,
        content: llmResponse.content,
        aiMetadata: {
          model: llmResponse.model,
          confidence: llmResponse.confidence ?? undefined,
          processingTimeMs: llmResponse.processingTimeMs,
          context: {
            provider: this.llmProvider.getProviderName(),
            triggerMessageId: command.triggerMessageId,
            tokensUsed: llmResponse.tokensUsed,
          },
        },
      });

      // 6. Guardar mensaje y publicar eventos
      const messageCtx = this.publisher.mergeObjectContext(aiMessage);
      const saveResult = await this.messageRepository.save(messageCtx);

      if (saveResult.isErr()) {
        throw new Error(
          `Error al guardar mensaje: ${saveResult.error.message}`,
        );
      }

      // CRITICAL: Commit para publicar eventos de dominio
      messageCtx.commit();

      this.logger.log(
        `✅ Respuesta IA generada en ${totalProcessingTimeMs}ms para chat ${command.chatId}`,
      );

      return {
        messageId: aiMessage.id.getValue(),
        content: llmResponse.content,
        processingTimeMs: totalProcessingTimeMs,
        model: llmResponse.model,
        tokensUsed: llmResponse.tokensUsed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `❌ Error generando respuesta IA para chat ${command.chatId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Obtiene la configuración del sitio o crea una por defecto
   */
  private async getOrCreateConfig(
    siteId: string,
    companyId: string,
  ): Promise<LlmSiteConfig> {
    const configResult = await this.configRepository.findBySiteId(siteId);

    if (configResult.isOk()) {
      return configResult.unwrap();
    }

    // Si no existe, crear configuración por defecto
    this.logger.debug(`Creando configuración por defecto para sitio ${siteId}`);
    const defaultConfig = LlmSiteConfig.createDefault(siteId, companyId);
    await this.configRepository.save(defaultConfig);

    return defaultConfig;
  }

  /**
   * Simula un delay para que la respuesta parezca más natural
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
