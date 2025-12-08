/**
 * Interface del servicio de ejecución de Tools
 * Orquesta la ejecución de herramientas invocadas por el LLM
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  LlmToolCall,
  LlmToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolConfigPrimitives,
} from '../tool-definitions';

/**
 * Interface para el servicio de ejecución de tools
 */
export interface ToolExecutorService {
  /**
   * Ejecuta una lista de tool calls
   * @param toolCalls Lista de tools a ejecutar
   * @param context Contexto de ejecución con info del sitio
   * @returns Array de resultados de ejecución
   */
  executeTools(
    toolCalls: LlmToolCall[],
    context: ToolExecutionContext,
  ): Promise<Result<ToolExecutionResult[], DomainError>>;

  /**
   * Obtiene las tools disponibles según la configuración del sitio
   * @param toolConfig Configuración de tools del sitio
   * @param baseDomain Dominio base para la descripción
   * @returns Lista de definiciones de tools habilitadas
   */
  getAvailableTools(
    toolConfig: ToolConfigPrimitives,
    baseDomain: string,
  ): LlmToolDefinition[];
}

/** Símbolo para inyección de dependencias */
export const TOOL_EXECUTOR_SERVICE = Symbol('ToolExecutorService');
