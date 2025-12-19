/**
 * Interfaces para Tool Use (Function Calling) del LLM
 * Permite que el modelo invoque herramientas para obtener información adicional
 */

/**
 * Definición de una tool disponible para el LLM
 * Compatible con el formato de OpenAI/Groq function calling
 */
export interface LlmToolDefinition {
  type: 'function';
  function: {
    /** Nombre único de la función */
    name: string;
    /** Descripción de cuándo y cómo usar esta tool */
    description: string;
    /** Schema JSON de los parámetros */
    parameters: {
      type: 'object';
      properties: Record<string, LlmToolParameterProperty>;
      required?: string[];
    };
  };
}

/**
 * Propiedad de un parámetro de tool
 */
export interface LlmToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: LlmToolParameterProperty;
}

/**
 * Tool call solicitado por el modelo
 */
export interface LlmToolCall {
  /** ID único del tool call */
  id: string;
  /** Tipo de tool (siempre 'function' por ahora) */
  type: 'function';
  /** Detalles de la función a invocar */
  function: {
    /** Nombre de la función */
    name: string;
    /** Argumentos en formato JSON string */
    arguments: string;
  };
}

/**
 * Resultado de la ejecución de una tool
 */
export interface ToolExecutionResult {
  /** ID del tool call al que responde */
  toolCallId: string;
  /** Si la ejecución fue exitosa */
  success: boolean;
  /** Contenido de la respuesta (texto/markdown) */
  content: string;
  /** Metadata adicional */
  metadata?: {
    /** URL de origen del contenido */
    sourceUrl?: string;
    /** Tiempo de fetch en ms */
    fetchTimeMs?: number;
    /** Si el contenido vino de cache */
    cached?: boolean;
    /** Tamaño original antes de truncar */
    originalSize?: number;
    /** Si fue truncado */
    truncated?: boolean;
  };
}

/**
 * Contexto para la ejecución de tools
 * Contiene información de la empresa para validación de URLs
 */
export interface ToolExecutionContext {
  /** ID de la compañía */
  companyId: string;
  /** ID del visitante actual (para tools que operan sobre el visitor) */
  visitorId?: string;
  /** ID del chat actual (para tools que operan sobre el chat) */
  chatId?: string;
  /** Dominio canónico del sitio principal (ej: www.ejemplo.com) */
  baseDomain: string;
  /** Dominios alias permitidos (de todos los sitios de la empresa) */
  allowedDomains: string[];
  /** Configuración de tools de la empresa */
  toolConfig: ToolConfigPrimitives;
}

/**
 * Configuración de tools por empresa
 */
export interface ToolConfigPrimitives {
  /** Habilitar fetch de páginas web */
  fetchPageEnabled: boolean;
  /** Habilitar guardar datos de contacto de leads */
  saveLeadContactEnabled?: boolean;
  /** Paths permitidos (vacío = todos) */
  allowedPaths?: string[];
  /** Máximo de iteraciones de tool calling */
  maxIterations: number;
  /** Timeout para fetch en ms */
  fetchTimeoutMs: number;
  /** Habilitar cache de contenido */
  cacheEnabled: boolean;
  /** TTL del cache en segundos */
  cacheTtlSeconds: number;
  /**
   * URL base para Tool Use (opcional)
   * Si no se especifica, se construye a partir del canonicalDomain del sitio
   * Útil para desarrollo local con puerto: 'http://localhost:8090'
   */
  baseUrl?: string;
}

/**
 * Valores por defecto para ToolConfig
 */
export const DEFAULT_TOOL_CONFIG: ToolConfigPrimitives = {
  fetchPageEnabled: false,
  saveLeadContactEnabled: false,
  allowedPaths: [],
  maxIterations: 3,
  fetchTimeoutMs: 10000,
  cacheEnabled: true,
  cacheTtlSeconds: 3600,
};

/**
 * Mensaje con role 'tool' para respuestas de tools
 */
export interface LlmToolMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

/**
 * Mensaje del asistente que incluye tool_calls
 */
export interface LlmAssistantMessageWithToolCalls {
  role: 'assistant';
  content: string | null;
  tool_calls: LlmToolCall[];
}
