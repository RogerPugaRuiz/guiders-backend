/**
 * Implementación mock del proveedor LLM para tests
 */

import { Injectable } from '@nestjs/common';
import { Provider } from '@nestjs/common';
import { Result, ok } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  LlmProviderService,
  LlmCompletionParams,
  LLM_PROVIDER_SERVICE,
} from '../../domain/services/llm-provider.service';
import { LlmResponse } from '../../domain/value-objects/llm-response';

@Injectable()
export class MockLlmProviderService implements LlmProviderService {
  private readonly defaultResponses = [
    '¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?',
    'Entiendo tu consulta. Déjame explicarte cómo podemos ayudarte.',
    'Gracias por tu interés. Un momento mientras busco la información que necesitas.',
    'Perfecto, puedo ayudarte con eso. ¿Podrías darme más detalles?',
  ];

  private readonly defaultSuggestions = [
    'Gracias por tu consulta. Estaré encantado de ayudarte con esto.',
    '¡Claro! Te explico los pasos a seguir para resolver tu caso.',
    'Entiendo perfectamente. Vamos a ver las opciones disponibles para ti.',
  ];

  async generateCompletion(
    params: LlmCompletionParams,
  ): Promise<Result<LlmResponse, DomainError>> {
    // Simular delay de procesamiento
    await this.simulateDelay(100, 300);

    const content = this.selectResponse(params);

    const response = LlmResponse.create({
      content,
      model: this.getDefaultModel(),
      tokensUsed: Math.floor(content.length / 4), // Aproximación
      processingTimeMs: Math.floor(Math.random() * 200) + 50,
      confidence: 0.95,
      finishReason: 'stop',
    });

    return ok(response);
  }

  async generateSuggestions(
    params: LlmCompletionParams,
    count = 3,
  ): Promise<Result<string[], DomainError>> {
    // Simular delay de procesamiento
    await this.simulateDelay(50, 150);

    // Devolver sugerencias mock
    const suggestions = this.defaultSuggestions.slice(0, count);

    // Personalizar según el último mensaje si existe
    const lastMessage =
      params.conversationHistory[params.conversationHistory.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const customSuggestion = `Respecto a "${lastMessage.content.substring(0, 30)}...", te comento que podemos ayudarte.`;
      suggestions[0] = customSuggestion;
    }

    return ok(suggestions);
  }

  getProviderName(): string {
    return 'mock';
  }

  getDefaultModel(): string {
    return 'mock-llama-3.1-70b';
  }

  /**
   * Selecciona una respuesta basada en el contexto
   */
  private selectResponse(params: LlmCompletionParams): string {
    const lastMessage =
      params.conversationHistory[params.conversationHistory.length - 1];

    if (!lastMessage) {
      return this.defaultResponses[0];
    }

    // Respuesta personalizada según el contenido
    const content = lastMessage.content.toLowerCase();

    if (
      content.includes('precio') ||
      content.includes('coste') ||
      content.includes('costo')
    ) {
      return 'Entiendo que te interesa conocer nuestros precios. Tenemos diferentes planes adaptados a cada necesidad. ¿Te gustaría que te explique las opciones disponibles?';
    }

    if (content.includes('ayuda') || content.includes('problema')) {
      return 'Lamento que estés teniendo dificultades. Estoy aquí para ayudarte a resolver cualquier problema. ¿Podrías describir con más detalle lo que está ocurriendo?';
    }

    if (content.includes('hola') || content.includes('buenas')) {
      return '¡Hola! Bienvenido a nuestro servicio de atención. ¿En qué puedo ayudarte hoy?';
    }

    if (content.includes('gracias')) {
      return '¡De nada! Es un placer poder ayudarte. Si tienes alguna otra pregunta, no dudes en consultarme.';
    }

    // Respuesta genérica aleatoria
    const randomIndex = Math.floor(
      Math.random() * this.defaultResponses.length,
    );
    return this.defaultResponses[randomIndex];
  }

  /**
   * Simula un delay aleatorio
   */
  private simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Provider mock para tests
 */
export const MockLlmProviderServiceProvider: Provider = {
  provide: LLM_PROVIDER_SERVICE,
  useClass: MockLlmProviderService,
};
