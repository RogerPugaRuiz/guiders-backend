/**
 * Implementación del proveedor LLM usando Groq con Llama 3.1 70B
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import Groq from 'groq-sdk';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  LlmProviderService,
  LlmCompletionParams,
  LlmCompletionWithToolsParams,
  LlmCompletionResult,
  LlmExtendedMessage,
  LLM_PROVIDER_SERVICE,
} from '../../domain/services/llm-provider.service';
import { LlmResponse } from '../../domain/value-objects/llm-response';
import {
  LlmProviderError,
  LlmRateLimitError,
} from '../../domain/errors/llm.error';
import { LlmToolDefinition } from '../../domain/tool-definitions';

@Injectable()
export class GroqLlmProviderService implements LlmProviderService {
  private readonly logger = new Logger(GroqLlmProviderService.name);
  private readonly client: Groq;
  private readonly defaultModel = 'llama-3.3-70b-versatile';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY no configurada. El servicio LLM no funcionará correctamente.',
      );
    }

    this.client = new Groq({
      apiKey: apiKey || '',
    });
  }

  async generateCompletion(
    params: LlmCompletionParams,
  ): Promise<Result<LlmResponse, DomainError>> {
    const startTime = Date.now();

    try {
      // Construir mensajes para el API de Groq
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: params.systemPrompt },
        ...params.conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      this.logger.debug(
        `Generando completación con ${messages.length} mensajes`,
      );

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages,
        max_tokens: params.maxTokens || 500,
        temperature: params.temperature || 0.7,
        stop: params.stopSequences,
      });

      const processingTimeMs = Date.now() - startTime;
      const choice = response.choices[0];

      if (!choice || !choice.message.content) {
        return err(
          new LlmProviderError(
            this.getProviderName(),
            'Respuesta vacía del modelo',
          ),
        );
      }

      const llmResponse = LlmResponse.create({
        content: choice.message.content,
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs,
        finishReason: choice.finish_reason || undefined,
      });

      this.logger.debug(
        `Completación generada en ${processingTimeMs}ms, tokens: ${response.usage?.total_tokens}`,
      );

      return ok(llmResponse);
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      this.logger.error(
        `Error en Groq después de ${processingTimeMs}ms: ${error}`,
      );

      // Manejar errores específicos de Groq
      if (this.isRateLimitError(error)) {
        const retryAfter = this.extractRetryAfter(error);
        return err(new LlmRateLimitError(this.getProviderName(), retryAfter));
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return err(new LlmProviderError(this.getProviderName(), errorMessage));
    }
  }

  /**
   * Genera una completación con soporte para tools (function calling)
   */
  async generateCompletionWithTools(
    params: LlmCompletionWithToolsParams,
  ): Promise<Result<LlmCompletionResult, DomainError>> {
    const startTime = Date.now();

    try {
      // Construir mensajes para el API de Groq
      const messages = this.buildMessagesWithTools(
        params.systemPrompt,
        params.messages,
      );

      this.logger.debug(
        `Generando completación con tools. Mensajes: ${messages.length}, Tools: ${params.tools?.length || 0}`,
      );

      // Construir parámetros de la request
      const baseParams = {
        model: this.defaultModel,
        messages,
        max_tokens: params.maxTokens || 500,
        temperature: params.temperature || 0.7,
      };

      // Agregar tools si están definidas
      const requestParams =
        params.tools && params.tools.length > 0
          ? {
              ...baseParams,
              tools: this.convertToolsToGroqFormat(params.tools),
              tool_choice: params.toolChoice || 'auto',
            }
          : baseParams;

      const response = await this.client.chat.completions.create(
        requestParams as any,
      );

      const processingTimeMs = Date.now() - startTime;
      const choice = response.choices[0];

      if (!choice) {
        return err(
          new LlmProviderError(
            this.getProviderName(),
            'Sin respuesta del modelo',
          ),
        );
      }

      // Detectar si hay tool_calls
      if (
        choice.finish_reason === 'tool_calls' &&
        choice.message.tool_calls &&
        choice.message.tool_calls.length > 0
      ) {
        this.logger.debug(
          `Modelo solicitó ${choice.message.tool_calls.length} tool calls`,
        );

        return ok({
          toolCalls: choice.message.tool_calls.map((tc) => ({
            id: tc.id,
            type: tc.type as 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
          finishReason: 'tool_calls',
        });
      }

      // Respuesta normal de texto
      if (!choice.message.content) {
        return err(
          new LlmProviderError(
            this.getProviderName(),
            'Respuesta vacía del modelo',
          ),
        );
      }

      const llmResponse = LlmResponse.create({
        content: choice.message.content,
        model: response.model,
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs,
        finishReason: choice.finish_reason || undefined,
      });

      this.logger.debug(
        `Completación con tools generada en ${processingTimeMs}ms, tokens: ${response.usage?.total_tokens}`,
      );

      return ok({
        response: llmResponse,
        finishReason: (choice.finish_reason as 'stop' | 'length') || 'stop',
      });
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      this.logger.error(
        `Error en Groq con tools después de ${processingTimeMs}ms: ${error}`,
      );

      if (this.isRateLimitError(error)) {
        const retryAfter = this.extractRetryAfter(error);
        return err(new LlmRateLimitError(this.getProviderName(), retryAfter));
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      return err(new LlmProviderError(this.getProviderName(), errorMessage));
    }
  }

  /**
   * Construye los mensajes en formato Groq incluyendo tool messages
   */
  private buildMessagesWithTools(
    systemPrompt: string,
    messages: LlmExtendedMessage[],
  ): Groq.Chat.ChatCompletionMessageParam[] {
    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of messages) {
      if (msg.role === 'tool') {
        // Tool response message
        groqMessages.push({
          role: 'tool',
          tool_call_id: msg.tool_call_id,
          content: msg.content,
        });
      } else if (msg.role === 'assistant' && 'tool_calls' in msg) {
        // Assistant message with tool calls
        groqMessages.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        });
      } else {
        // Regular message
        groqMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return groqMessages;
  }

  /**
   * Convierte las tool definitions al formato de Groq
   */
  private convertToolsToGroqFormat(
    tools: LlmToolDefinition[],
  ): Groq.Chat.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: tool.type,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters as Record<string, unknown>,
      },
    }));
  }

  async generateSuggestions(
    params: LlmCompletionParams,
    count = 3,
  ): Promise<Result<string[], DomainError>> {
    // Modificar el system prompt para pedir sugerencias
    const suggestionsPrompt = `${params.systemPrompt}

IMPORTANTE: Tu tarea es generar exactamente ${count} sugerencias de respuesta diferentes para que un comercial responda al cliente.
Las sugerencias deben ser variadas en tono y enfoque.
Formato de respuesta:
1. [Primera sugerencia]
2. [Segunda sugerencia]
3. [Tercera sugerencia]

Solo devuelve las sugerencias numeradas, sin explicaciones adicionales.`;

    const result = await this.generateCompletion({
      ...params,
      systemPrompt: suggestionsPrompt,
      maxTokens: params.maxTokens || 800, // Más tokens para múltiples sugerencias
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const response = result.unwrap();
    const suggestions = this.parseSuggestions(response.content, count);

    return ok(suggestions);
  }

  getProviderName(): string {
    return 'groq';
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Parsea las sugerencias de la respuesta del modelo
   */
  private parseSuggestions(content: string, expectedCount: number): string[] {
    const lines = content.split('\n').filter((line) => line.trim());
    const suggestions: string[] = [];

    for (const line of lines) {
      // Buscar líneas que empiecen con número y punto (1. 2. 3.)
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && match[1]) {
        suggestions.push(match[1].trim());
      }
    }

    // Si no encontramos el formato esperado, intentar dividir por líneas
    if (suggestions.length === 0 && lines.length > 0) {
      return lines.slice(0, expectedCount);
    }

    return suggestions.slice(0, expectedCount);
  }

  /**
   * Detecta si el error es de rate limit
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('rate_limit') ||
        error.message.includes('429') ||
        error.message.includes('Too Many Requests')
      );
    }
    return false;
  }

  /**
   * Extrae el tiempo de espera del error de rate limit
   */
  private extractRetryAfter(error: unknown): number | undefined {
    if (error instanceof Error) {
      const match = error.message.match(/retry after (\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return undefined;
  }
}

/**
 * Provider para inyección de dependencias
 */
export const GroqLlmProviderServiceProvider: Provider = {
  provide: LLM_PROVIDER_SERVICE,
  useClass: GroqLlmProviderService,
};
