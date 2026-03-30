/**
 * Handler para el comando de generar sugerencias
 * Soporta tool use (function calling) para obtener información de la web
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GenerateSuggestionCommand } from './generate-suggestion.command';
import { SuggestionResponseDto } from '../dtos/ai-response.dto';
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
import { LlmCompanyConfig } from '../../domain/value-objects/llm-company-config';
import {
  ToolExecutionContext,
  LlmAssistantMessageWithToolCalls,
} from '../../domain/tool-definitions';
import { GetCompanySitesQuery } from 'src/context/company/application/queries/get-company-sites.query';

@CommandHandler(GenerateSuggestionCommand)
export class GenerateSuggestionCommandHandler
  implements ICommandHandler<GenerateSuggestionCommand>
{
  private readonly logger = new Logger(GenerateSuggestionCommandHandler.name);
  private readonly SUGGESTIONS_COUNT = 3;
  private readonly BREVITY_INSTRUCTION = `

IMPORTANTE: Responde de forma breve y concisa.`;

  constructor(
    @Inject(LLM_PROVIDER_SERVICE)
    private readonly llmProvider: LlmProviderService,
    @Inject(LLM_CONTEXT_BUILDER_SERVICE)
    private readonly contextBuilder: LlmContextBuilderService,
    @Inject(TOOL_EXECUTOR_SERVICE)
    private readonly toolExecutor: ToolExecutorService,
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    command: GenerateSuggestionCommand,
  ): Promise<SuggestionResponseDto> {
    const startTime = Date.now();
    this.logger.debug(
      `Generando sugerencias para comercial ${command.commercialId} en chat ${command.chatId}`,
    );

    try {
      // 1. Verificar configuración
      const config = await this.getConfig(command.companyId);

      if (!config.aiSuggestionsEnabled) {
        this.logger.debug(
          `Sugerencias deshabilitadas para empresa ${command.companyId}`,
        );
        return {
          suggestions: [],
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 2. Construir contexto simplificado
      const contextResult = await this.contextBuilder.buildSimpleContext(
        command.chatId,
        10, // Solo últimos 10 mensajes para sugerencias
      );

      if (contextResult.isErr()) {
        this.logger.warn(
          `Error al construir contexto: ${contextResult.error.message}`,
        );
        return {
          suggestions: [],
          processingTimeMs: Date.now() - startTime,
        };
      }

      const context = contextResult.unwrap();

      // 3. Verificar si tools están habilitadas
      const toolConfig = config.toolConfig;
      const hasToolsEnabled = toolConfig.hasAnyToolEnabled();

      this.logger.debug(
        `[Suggestions Tool Use Debug] companyId=${command.companyId}, hasToolsEnabled=${hasToolsEnabled}`,
      );

      let additionalContext = '';

      if (hasToolsEnabled) {
        // 3a. Obtener información adicional usando tools
        try {
          const toolContextInfo = await this.gatherToolContext(
            command,
            config,
            context.conversationHistory,
          );
          additionalContext = toolContextInfo;
          this.logger.debug(
            `[Suggestions Tool Use] Contexto adicional obtenido: ${additionalContext.length} caracteres`,
          );
        } catch (error) {
          this.logger.warn(
            `Error obteniendo contexto de tools: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          );
          // Continuar sin contexto adicional
        }
      }

      // 4. Generar sugerencias con contexto enriquecido
      const suggestionsResult = await this.llmProvider.generateSuggestions(
        {
          systemPrompt: this.buildSuggestionsPrompt(
            config.customSystemPrompt,
            additionalContext,
          ),
          conversationHistory: context.conversationHistory,
          maxTokens: 600, // Suficiente para 3 sugerencias
          temperature: 0.8, // Un poco más creativo para variedad
        },
        this.SUGGESTIONS_COUNT,
      );

      const processingTimeMs = Date.now() - startTime;

      if (suggestionsResult.isErr()) {
        this.logger.warn(
          `Error al generar sugerencias: ${suggestionsResult.error.message}`,
        );
        return {
          suggestions: [],
          processingTimeMs,
        };
      }

      const suggestions = suggestionsResult.unwrap();

      this.logger.debug(
        `Generadas ${suggestions.length} sugerencias en ${processingTimeMs}ms`,
      );

      return {
        suggestions,
        processingTimeMs,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error generando sugerencias: ${errorMessage}`);

      return {
        suggestions: [],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Obtiene la configuración de la empresa
   */
  private async getConfig(companyId: string): Promise<LlmCompanyConfig> {
    const configResult = await this.configRepository.findByCompanyId(companyId);

    if (configResult.isOk()) {
      return configResult.unwrap();
    }

    // Retornar config por defecto si no existe
    return LlmCompanyConfig.createDefault(companyId);
  }

  /**
   * Construye el prompt específico para sugerencias
   */
  private buildSuggestionsPrompt(
    customPrompt?: string | null,
    additionalContext?: string,
  ): string {
    const basePrompt =
      customPrompt ||
      `Eres un asistente de atención al cliente profesional y eficiente.`;

    // Inyectar instrucción de brevedad SIEMPRE
    const promptWithBrevity = basePrompt + this.BREVITY_INSTRUCTION;

    let contextSection = '';
    if (additionalContext && additionalContext.trim().length > 0) {
      contextSection = `

INFORMACIÓN ADICIONAL DEL SITIO WEB:
${additionalContext}

Usa esta información para generar sugerencias más precisas y relevantes.`;
    }

    return `${promptWithBrevity}${contextSection}

Tu tarea es generar sugerencias de respuesta para un comercial que está atendiendo a un cliente.
Las sugerencias deben ser:
- Breves y concisas - Máximo 2-3 oraciones por sugerencia
- Profesionales y amables
- Variadas en enfoque y tono
- Directas y útiles
- En español
- Basadas en la información disponible del sitio web cuando sea relevante

No incluyas explicaciones adicionales, solo las sugerencias numeradas.`;
  }

  /**
   * Obtiene contexto adicional usando tools (fetch de páginas web)
   */
  private async gatherToolContext(
    command: GenerateSuggestionCommand,
    config: LlmCompanyConfig,
    conversationHistory: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>,
  ): Promise<string> {
    const toolConfig = config.toolConfig;
    const maxIterations = toolConfig.toPrimitives().maxIterations;

    // Obtener información del sitio para construir el contexto de tools
    const toolContext = await this.buildToolContext(command, config);

    // Obtener tools disponibles
    const tools = this.toolExecutor.getAvailableTools(
      toolConfig.toPrimitives(),
      toolContext.baseDomain,
    );

    if (tools.length === 0) {
      this.logger.debug('No hay tools disponibles para sugerencias');
      return '';
    }

    // Construir prompt para decidir qué información obtener
    const gatherPrompt = `Eres un asistente que ayuda a un comercial a responder preguntas de clientes.
Analiza la conversación y determina si necesitas obtener información del sitio web para poder sugerir respuestas precisas.
Si el cliente pregunta sobre productos, servicios, precios, horarios u otra información específica, usa la herramienta fetch_page_content para obtener esa información.
Si la conversación es un saludo simple o no requiere información específica, responde directamente con "NO_TOOL_NEEDED".`;

    // Construir mensajes iniciales
    const messages: LlmExtendedMessage[] = conversationHistory
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // Añadir instrucción para el modelo
    messages.push({
      role: 'user',
      content:
        'Analiza la conversación anterior y obtén información relevante del sitio web si es necesario para ayudar al comercial a responder.',
    });

    let iteration = 0;
    const gatheredInfo: string[] = [];

    // Loop de tool use para obtener información
    while (iteration < maxIterations) {
      this.logger.debug(
        `[Suggestions] Tool use iteration ${iteration + 1}/${maxIterations}`,
      );

      const result = await this.llmProvider.generateCompletionWithTools({
        systemPrompt: gatherPrompt,
        messages,
        maxTokens: 500,
        temperature: 0.3, // Más determinístico para decidir qué información obtener
        tools,
        toolChoice: 'auto',
      });

      if (result.isErr()) {
        this.logger.warn(
          `Error en LLM al obtener contexto: ${result.error.message}`,
        );
        break;
      }

      const completion = result.unwrap();

      // Si no hay tool calls, terminamos
      if (completion.finishReason !== 'tool_calls' || !completion.toolCalls) {
        // Verificar si el modelo indicó que no necesita tools
        if (
          completion.response?.content?.includes('NO_TOOL_NEEDED') ||
          !completion.toolCalls
        ) {
          this.logger.debug(
            '[Suggestions] El modelo determinó que no necesita información adicional',
          );
        }
        break;
      }

      // Ejecutar tools
      this.logger.debug(
        `[Suggestions] Ejecutando ${completion.toolCalls.length} tool calls`,
      );

      const toolResults = await this.toolExecutor.executeTools(
        completion.toolCalls,
        toolContext,
      );

      if (toolResults.isErr()) {
        this.logger.warn(
          `Error ejecutando tools: ${toolResults.error.message}`,
        );
        break;
      }

      // Agregar assistant message con tool_calls al historial
      const assistantMessage: LlmAssistantMessageWithToolCalls = {
        role: 'assistant',
        content: null,
        tool_calls: completion.toolCalls,
      };
      messages.push(assistantMessage);

      // Agregar resultados de tools al historial y recopilar info
      for (const toolResult of toolResults.unwrap()) {
        messages.push({
          role: 'tool',
          tool_call_id: toolResult.toolCallId,
          content: toolResult.content,
        });

        // Guardar la información obtenida
        if (
          toolResult.content &&
          !toolResult.content.startsWith('Error') &&
          !toolResult.content.includes('no permitido')
        ) {
          gatheredInfo.push(toolResult.content);
        }
      }

      iteration++;
    }

    // Combinar toda la información obtenida
    if (gatheredInfo.length === 0) {
      return '';
    }

    // Limitar el tamaño del contexto adicional
    const combinedInfo = gatheredInfo.join('\n\n---\n\n');
    const maxContextLength = 2000; // Limitar para no sobrecargar el prompt

    if (combinedInfo.length > maxContextLength) {
      return combinedInfo.substring(0, maxContextLength) + '...';
    }

    return combinedInfo;
  }

  /**
   * Construye el contexto de ejecución de tools
   */
  private async buildToolContext(
    command: GenerateSuggestionCommand,
    config: LlmCompanyConfig,
  ): Promise<ToolExecutionContext> {
    const toolConfigPrimitives = config.toolConfig.toPrimitives();

    // Si hay baseUrl configurada en toolConfig, usarla directamente
    if (toolConfigPrimitives.baseUrl) {
      this.logger.debug(
        `[Suggestions Tool Use] Usando baseUrl de toolConfig: "${toolConfigPrimitives.baseUrl}"`,
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

    if (!baseDomain) {
      this.logger.warn(
        `No se encontró dominio para empresa ${command.companyId}, tools pueden no funcionar`,
      );
    }

    this.logger.debug(
      `[Suggestions Tool Use] buildToolContext: baseDomain="${baseDomain}", allowedDomains=${JSON.stringify(allowedDomains)}`,
    );

    return {
      companyId: command.companyId,
      baseDomain,
      allowedDomains,
      toolConfig: toolConfigPrimitives,
    };
  }
}
