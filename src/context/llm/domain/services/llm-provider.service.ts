/**
 * Interface del servicio proveedor de LLM
 * Define el contrato para diferentes proveedores (Groq, OpenAI, Anthropic, Ollama)
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { LlmResponse } from '../value-objects/llm-response';

/**
 * Mensaje del historial de conversación
 */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Parámetros para generar una completación
 */
export interface LlmCompletionParams {
  /** Prompt del sistema con instrucciones */
  systemPrompt: string;
  /** Historial de la conversación */
  conversationHistory: LlmMessage[];
  /** Contexto adicional del visitante */
  visitorContext?: Record<string, unknown>;
  /** Tokens máximos de respuesta */
  maxTokens?: number;
  /** Temperatura (0-1, mayor = más creativo) */
  temperature?: number;
  /** Secuencias para detener la generación */
  stopSequences?: string[];
}

/**
 * Interface del proveedor de LLM
 * Implementar esta interface para añadir nuevos proveedores
 */
export interface LlmProviderService {
  /**
   * Genera una respuesta de texto basada en el contexto
   * @param params Parámetros de la completación
   * @returns Resultado con la respuesta o error
   */
  generateCompletion(
    params: LlmCompletionParams,
  ): Promise<Result<LlmResponse, DomainError>>;

  /**
   * Genera múltiples sugerencias de respuesta para un comercial
   * @param params Parámetros de la completación
   * @param count Número de sugerencias a generar (por defecto 3)
   * @returns Resultado con array de sugerencias o error
   */
  generateSuggestions(
    params: LlmCompletionParams,
    count?: number,
  ): Promise<Result<string[], DomainError>>;

  /**
   * Nombre del proveedor para logging/métricas
   */
  getProviderName(): string;

  /**
   * Modelo por defecto del proveedor
   */
  getDefaultModel(): string;
}

/** Símbolo para inyección de dependencias */
export const LLM_PROVIDER_SERVICE = Symbol('LlmProviderService');
