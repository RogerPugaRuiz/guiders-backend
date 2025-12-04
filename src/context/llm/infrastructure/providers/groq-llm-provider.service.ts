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
  LLM_PROVIDER_SERVICE,
} from '../../domain/services/llm-provider.service';
import { LlmResponse } from '../../domain/value-objects/llm-response';
import {
  LlmProviderError,
  LlmRateLimitError,
} from '../../domain/errors/llm.error';

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
