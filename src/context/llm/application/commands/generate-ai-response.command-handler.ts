/**
 * Handler para el comando de generar respuesta de IA
 * Soporta tool use (function calling) para obtener información de la web
 */

import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GenerateAIResponseCommand } from './generate-ai-response.command';
import { AIResponseDto } from '../dtos/ai-response.dto';
import {
  LlmProviderService,
  LlmExtendedMessage,
  LLM_PROVIDER_SERVICE,
} from '../../domain/services/llm-provider.service';
import {
  LlmContextBuilderService,
  LLM_CONTEXT_BUILDER_SERVICE,
} from '../../domain/services/llm-context-builder.service';
import {
  ToolExecutorService,
  TOOL_EXECUTOR_SERVICE,
} from '../../domain/services/tool-executor.service';
import {
  ILlmConfigRepository,
  LLM_CONFIG_REPOSITORY,
} from '../../domain/llm-config.repository';
import {
  IMessageRepository,
  MESSAGE_V2_REPOSITORY,
} from 'src/context/conversations-v2/domain/message.repository';
import { Message } from 'src/context/conversations-v2/domain/entities/message.aggregate';
import { LlmCompanyConfig } from '../../domain/value-objects/llm-company-config';
import {
  ToolExecutionContext,
  LlmAssistantMessageWithToolCalls,
} from '../../domain/tool-definitions';
import { LlmMaxIterationsError } from '../../domain/errors/llm.error';
import { GetCompanySitesQuery } from 'src/context/company/application/queries/get-company-sites.query';

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
    @Inject(TOOL_EXECUTOR_SERVICE)
    private readonly toolExecutor: ToolExecutorService,
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
    @Inject(MESSAGE_V2_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
    private readonly publisher: EventPublisher,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: GenerateAIResponseCommand): Promise<AIResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `Generando respuesta IA para chat ${command.chatId}, trigger: ${command.triggerMessageId}`,
    );

    try {
      // 1. Obtener configuración de la empresa
      const config = await this.getOrCreateConfig(command.companyId);

      // 2. Construir contexto para el LLM
      const contextResult = await this.contextBuilder.buildContext({
        chatId: command.chatId,
        visitorId: command.visitorId,
        companyId: command.companyId,
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

      // 4. Verificar si tools están habilitadas
      const toolConfig = config.toolConfig;
      const hasToolsEnabled = toolConfig.hasAnyToolEnabled();

      // DEBUG: Log para diagnosticar Tool Use
      this.logger.debug(
        `[Tool Use Debug] companyId=${command.companyId}, fetchPageEnabled=${toolConfig.fetchPageEnabled}, hasToolsEnabled=${hasToolsEnabled}`,
      );
      this.logger.debug(
        `[Tool Use Debug] toolConfig=${JSON.stringify(toolConfig.toPrimitives())}`,
      );

      let responseContent: string;
      let model: string;
      let tokensUsed: number;
      let processingTimeMs: number;

      if (hasToolsEnabled) {
        // 4a. Generar respuesta con tool use loop
        const toolResult = await this.generateWithTools(
          command,
          config,
          context.getEnrichedSystemPrompt(),
          context.conversationHistory,
        );
        responseContent = toolResult.content;
        model = toolResult.model;
        tokensUsed = toolResult.tokensUsed;
        processingTimeMs = toolResult.processingTimeMs;
      } else {
        // 4b. Generar respuesta simple (sin tools)
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
        responseContent = llmResponse.content;
        model = llmResponse.model;
        tokensUsed = llmResponse.tokensUsed;
        processingTimeMs = llmResponse.processingTimeMs;
      }

      const totalProcessingTimeMs = Date.now() - startTime;

      // 5. Crear mensaje de IA usando el factory existente
      const aiMessage = Message.createAIMessage({
        chatId: command.chatId,
        content: responseContent,
        aiMetadata: {
          model,
          confidence: undefined,
          processingTimeMs,
          context: {
            provider: this.llmProvider.getProviderName(),
            triggerMessageId: command.triggerMessageId,
            tokensUsed,
            toolsUsed: hasToolsEnabled,
          },
        },
      });

      // 6. Guardar mensaje y publicar eventos
      this.logger.log(
        `[AI_SAVE] Intentando guardar mensaje de IA para chat ${command.chatId}`,
      );
      this.logger.debug(
        `[AI_SAVE] aiMessage.id=${aiMessage.id.getValue()}, content.length=${responseContent.length}`,
      );

      const messageCtx = this.publisher.mergeObjectContext(aiMessage);
      const saveResult = await this.messageRepository.save(messageCtx);

      if (saveResult.isErr()) {
        this.logger.error(
          `[AI_SAVE_ERROR] Error al guardar mensaje IA: ${saveResult.error.message}`,
          JSON.stringify({
            chatId: command.chatId,
            messageId: aiMessage.id.getValue(),
            errorName: saveResult.error.name,
          }),
        );
        throw new Error(
          `Error al guardar mensaje: ${saveResult.error.message}`,
        );
      }

      this.logger.log(
        `[AI_SAVE_OK] Mensaje de IA guardado correctamente: ${aiMessage.id.getValue()}`,
      );

      // CRITICAL: Commit para publicar eventos de dominio
      messageCtx.commit();

      this.logger.log(
        `✅ Respuesta IA generada en ${totalProcessingTimeMs}ms para chat ${command.chatId}${hasToolsEnabled ? ' (con tools)' : ''}`,
      );

      return {
        messageId: aiMessage.id.getValue(),
        content: responseContent,
        processingTimeMs: totalProcessingTimeMs,
        model,
        tokensUsed,
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

  private readonly TOOL_USE_INSTRUCTION = `

USO DE HERRAMIENTAS:
- Puedes usar la herramienta fetch_page_content para obtener información del sitio web
- Usa la herramienta MÁXIMO UNA VEZ por pregunta del usuario
- Después de obtener información con la herramienta, DEBES responder inmediatamente al usuario
- NO llames a la herramienta múltiples veces - usa la información que ya obtuviste
- Si la información obtenida no es suficiente, responde con lo que tienes y sugiere que el usuario pregunte algo más específico`;

  /**
   * Genera una respuesta usando el loop de tool use
   */
  private async generateWithTools(
    command: GenerateAIResponseCommand,
    config: LlmCompanyConfig,
    systemPrompt: string,
    conversationHistory: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>,
  ): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    const toolConfig = config.toolConfig;
    const maxIterations = toolConfig.toPrimitives().maxIterations;

    // Agregar instrucciones de uso de tools al system prompt
    const enrichedSystemPrompt = systemPrompt + this.TOOL_USE_INSTRUCTION;

    // Obtener información del sitio para construir el contexto de tools
    const toolContext = await this.buildToolContext(command, config);

    // Obtener tools disponibles
    const tools = this.toolExecutor.getAvailableTools(
      toolConfig.toPrimitives(),
      toolContext.baseDomain,
    );

    if (tools.length === 0) {
      throw new Error(
        'No hay tools disponibles pero toolConfig está habilitado',
      );
    }

    // Construir mensajes iniciales (filtrar system messages ya que el system prompt se pasa aparte)
    const messages: LlmExtendedMessage[] = conversationHistory
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    let iteration = 0;
    let totalTokensUsed = 0;
    let model = '';

    // Loop de tool use
    while (iteration < maxIterations) {
      this.logger.debug(`Tool use iteration ${iteration + 1}/${maxIterations}`);

      const result = await this.llmProvider.generateCompletionWithTools({
        systemPrompt: enrichedSystemPrompt,
        messages,
        maxTokens: config.maxResponseTokens,
        temperature: config.temperature,
        tools,
        toolChoice: 'auto',
      });

      if (result.isErr()) {
        throw new Error(`Error en LLM: ${result.error.message}`);
      }

      const completion = result.unwrap();
      model = completion.response?.model || model;
      totalTokensUsed += completion.response?.tokensUsed || 0;

      // Si no hay tool calls, tenemos la respuesta final
      if (completion.finishReason !== 'tool_calls' || !completion.toolCalls) {
        if (!completion.response) {
          throw new Error('No se recibió respuesta del modelo');
        }

        return {
          content: completion.response.content,
          model: completion.response.model,
          tokensUsed: totalTokensUsed,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Ejecutar tools
      this.logger.debug(`Ejecutando ${completion.toolCalls.length} tool calls`);

      const toolResults = await this.toolExecutor.executeTools(
        completion.toolCalls,
        toolContext,
      );

      if (toolResults.isErr()) {
        throw new Error(`Error ejecutando tools: ${toolResults.error.message}`);
      }

      // Agregar assistant message con tool_calls al historial
      const assistantMessage: LlmAssistantMessageWithToolCalls = {
        role: 'assistant',
        content: null,
        tool_calls: completion.toolCalls,
      };
      messages.push(assistantMessage);

      // Agregar resultados de tools al historial
      for (const toolResult of toolResults.unwrap()) {
        messages.push({
          role: 'tool',
          tool_call_id: toolResult.toolCallId,
          content: toolResult.content,
        });
      }

      iteration++;
    }

    // Si llegamos aquí, se excedió el máximo de iteraciones
    // En lugar de lanzar error, hacer una última llamada SIN tools para forzar respuesta
    this.logger.warn(
      `Alcanzado máximo de ${maxIterations} iteraciones de tool calling. Forzando respuesta final sin tools.`,
    );

    // Hacer una última llamada forzando respuesta de texto (sin tools)
    const finalResult = await this.llmProvider.generateCompletionWithTools({
      systemPrompt:
        enrichedSystemPrompt +
        '\n\nIMPORTANTE: Ya has consultado suficiente información. Ahora DEBES responder al usuario con la información que tienes disponible. NO solicites más información.',
      messages,
      maxTokens: config.maxResponseTokens,
      temperature: config.temperature,
      tools: [], // Sin tools para forzar respuesta de texto
      toolChoice: 'none',
    });

    if (finalResult.isErr()) {
      this.logger.error(
        `Error en llamada final sin tools: ${finalResult.error.message}`,
      );
      throw new LlmMaxIterationsError(maxIterations);
    }

    const finalCompletion = finalResult.unwrap();

    if (!finalCompletion.response?.content) {
      this.logger.error(
        'No se pudo obtener respuesta final después de alcanzar maxIterations',
      );
      throw new LlmMaxIterationsError(maxIterations);
    }

    this.logger.log(
      `Respuesta final generada después de ${maxIterations} iteraciones de tool calling`,
    );

    return {
      content: finalCompletion.response.content,
      model: finalCompletion.response.model || model,
      tokensUsed: totalTokensUsed + (finalCompletion.response.tokensUsed || 0),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Construye el contexto de ejecución de tools
   */
  private async buildToolContext(
    command: GenerateAIResponseCommand,
    config: LlmCompanyConfig,
  ): Promise<ToolExecutionContext> {
    const toolConfigPrimitives = config.toolConfig.toPrimitives();

    // Si hay baseUrl configurada en toolConfig, usarla directamente
    // Útil para desarrollo local con puerto (ej: http://localhost:8090)
    if (toolConfigPrimitives.baseUrl) {
      this.logger.debug(
        `[Tool Use Debug] Usando baseUrl de toolConfig: "${toolConfigPrimitives.baseUrl}"`,
      );
      return {
        companyId: command.companyId,
        baseDomain: toolConfigPrimitives.baseUrl,
        allowedDomains: [],
        toolConfig: toolConfigPrimitives,
      };
    }

    // Obtener información de los sitios de la empresa
    let baseDomain = '';
    let allowedDomains: string[] = [];

    try {
      const companySitesResult = await this.queryBus.execute(
        new GetCompanySitesQuery(command.companyId),
      );

      if (companySitesResult?.sites && companySitesResult.sites.length > 0) {
        // Usar el primer sitio de la empresa como dominio base
        const site = companySitesResult.sites[0];
        baseDomain = site.canonicalDomain || '';
        allowedDomains = site.domainAliases || [];

        // Agregar todos los dominios de todos los sitios como permitidos
        companySitesResult.sites.forEach(
          (s: { canonicalDomain?: string; domainAliases?: string[] }) => {
            if (s.canonicalDomain) {
              allowedDomains.push(s.canonicalDomain);
            }
            if (s.domainAliases) {
              allowedDomains.push(...s.domainAliases);
            }
          },
        );
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener información de los sitios de la empresa ${command.companyId}: ${error}`,
      );
    }

    // Si no tenemos dominio, usar un fallback
    if (!baseDomain) {
      this.logger.warn(
        `No se encontró dominio para empresa ${command.companyId}, tools pueden no funcionar`,
      );
    }

    this.logger.debug(
      `[Tool Use Debug] buildToolContext: baseDomain="${baseDomain}", allowedDomains=${JSON.stringify(allowedDomains)}`,
    );

    return {
      companyId: command.companyId,
      baseDomain,
      allowedDomains,
      toolConfig: toolConfigPrimitives,
    };
  }

  /**
   * Obtiene la configuración de la empresa o crea una por defecto
   */
  private async getOrCreateConfig(
    companyId: string,
  ): Promise<LlmCompanyConfig> {
    const configResult = await this.configRepository.findByCompanyId(companyId);

    if (configResult.isOk()) {
      return configResult.unwrap();
    }

    // Si no existe, crear configuración por defecto
    this.logger.debug(
      `Creando configuración por defecto para empresa ${companyId}`,
    );
    const defaultConfig = LlmCompanyConfig.createDefault(companyId);
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
