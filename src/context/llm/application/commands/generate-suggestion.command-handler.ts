/**
 * Handler para el comando de generar sugerencias
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GenerateSuggestionCommand } from './generate-suggestion.command';
import { SuggestionResponseDto } from '../dtos/ai-response.dto';
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
import { LlmCompanyConfig } from '../../domain/value-objects/llm-company-config';

@CommandHandler(GenerateSuggestionCommand)
export class GenerateSuggestionCommandHandler
  implements ICommandHandler<GenerateSuggestionCommand>
{
  private readonly logger = new Logger(GenerateSuggestionCommandHandler.name);
  private readonly SUGGESTIONS_COUNT = 3;

  constructor(
    @Inject(LLM_PROVIDER_SERVICE)
    private readonly llmProvider: LlmProviderService,
    @Inject(LLM_CONTEXT_BUILDER_SERVICE)
    private readonly contextBuilder: LlmContextBuilderService,
    @Inject(LLM_CONFIG_REPOSITORY)
    private readonly configRepository: ILlmConfigRepository,
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

      // 3. Generar sugerencias
      const suggestionsResult = await this.llmProvider.generateSuggestions(
        {
          systemPrompt: this.buildSuggestionsPrompt(config.customSystemPrompt),
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
  private buildSuggestionsPrompt(customPrompt?: string | null): string {
    const basePrompt =
      customPrompt ||
      `Eres un asistente de atención al cliente profesional y eficiente.`;

    return `${basePrompt}

Tu tarea es generar sugerencias de respuesta para un comercial que está atendiendo a un cliente.
Las sugerencias deben ser:
- Profesionales y amables
- Variadas en enfoque y tono
- Directas y útiles
- En español

No incluyas explicaciones adicionales, solo las sugerencias numeradas.`;
  }
}
