/**
 * Errores específicos del contexto LLM
 */

import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error base para operaciones LLM
 */
export class LlmError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'LlmError';
  }
}

/**
 * Error cuando falla la llamada al proveedor de LLM
 */
export class LlmProviderError extends LlmError {
  constructor(
    public readonly provider: string,
    public readonly originalError: string,
  ) {
    super(`Error del proveedor ${provider}: ${originalError}`);
    this.name = 'LlmProviderError';
  }
}

/**
 * Error cuando no se puede construir el contexto
 */
export class LlmContextBuildError extends LlmError {
  constructor(
    public readonly reason: string,
    public readonly chatId?: string,
  ) {
    super(
      `Error al construir contexto LLM${chatId ? ` para chat ${chatId}` : ''}: ${reason}`,
    );
    this.name = 'LlmContextBuildError';
  }
}

/**
 * Error cuando la configuración del LLM no existe o es inválida
 */
export class LlmConfigNotFoundError extends LlmError {
  constructor(public readonly siteId: string) {
    super(`No se encontró configuración LLM para el sitio ${siteId}`);
    this.name = 'LlmConfigNotFoundError';
  }
}

/**
 * Error cuando el proveedor no está disponible
 */
export class LlmProviderUnavailableError extends LlmError {
  constructor(public readonly provider: string) {
    super(`El proveedor LLM ${provider} no está disponible`);
    this.name = 'LlmProviderUnavailableError';
  }
}

/**
 * Error de límite de rate excedido
 */
export class LlmRateLimitError extends LlmError {
  constructor(
    public readonly provider: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(
      `Límite de peticiones excedido para ${provider}${retryAfterSeconds ? `. Reintentar en ${retryAfterSeconds}s` : ''}`,
    );
    this.name = 'LlmRateLimitError';
  }
}

/**
 * Error cuando el chat no tiene mensajes para procesar
 */
export class LlmEmptyChatError extends LlmError {
  constructor(public readonly chatId: string) {
    super(`El chat ${chatId} no tiene mensajes para procesar`);
    this.name = 'LlmEmptyChatError';
  }
}
