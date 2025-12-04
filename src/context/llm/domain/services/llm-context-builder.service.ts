/**
 * Interface del servicio constructor de contexto para LLM
 * Construye el contexto completo necesario para generar respuestas
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { LlmContext } from '../value-objects/llm-context';

/**
 * Parámetros para construir el contexto
 */
export interface BuildContextParams {
  /** ID del chat */
  chatId: string;
  /** ID del visitante */
  visitorId: string;
  /** ID de la compañía */
  companyId: string;
  /** ID del sitio */
  siteId: string;
  /** Incluir información del visitante (página actual, lifecycle, etc.) */
  includeVisitorInfo?: boolean;
  /** Número máximo de mensajes del historial a incluir */
  maxHistoryMessages?: number;
  /** Prompt del sistema personalizado (opcional) */
  customSystemPrompt?: string;
}

/**
 * Interface del constructor de contexto
 */
export interface LlmContextBuilderService {
  /**
   * Construye el contexto completo para el LLM
   * Incluye: historial de mensajes, datos del visitante, información de empresa
   * @param params Parámetros de construcción
   * @returns Resultado con el contexto o error
   */
  buildContext(
    params: BuildContextParams,
  ): Promise<Result<LlmContext, DomainError>>;

  /**
   * Construye contexto simplificado solo con el historial del chat
   * Útil para sugerencias rápidas
   * @param chatId ID del chat
   * @param maxMessages Número máximo de mensajes
   * @returns Resultado con el contexto o error
   */
  buildSimpleContext(
    chatId: string,
    maxMessages?: number,
  ): Promise<Result<LlmContext, DomainError>>;
}

/** Símbolo para inyección de dependencias */
export const LLM_CONTEXT_BUILDER_SERVICE = Symbol('LlmContextBuilderService');
