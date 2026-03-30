/**
 * Value Object que representa la respuesta de un LLM
 */

/**
 * Primitivos de la respuesta LLM
 */
export interface LlmResponsePrimitives {
  /** Contenido de texto de la respuesta */
  content: string;
  /** Modelo usado para generar la respuesta */
  model: string;
  /** Tokens utilizados en la respuesta */
  tokensUsed: number;
  /** Tiempo de procesamiento en milisegundos */
  processingTimeMs: number;
  /** Nivel de confianza (0-1) si está disponible */
  confidence?: number;
  /** Razón de finalización (stop, length, etc.) */
  finishReason?: string;
}

/**
 * Value Object para respuesta de LLM
 */
export class LlmResponse {
  private constructor(
    private readonly _content: string,
    private readonly _model: string,
    private readonly _tokensUsed: number,
    private readonly _processingTimeMs: number,
    private readonly _confidence: number | null,
    private readonly _finishReason: string | null,
  ) {}

  /**
   * Crea una nueva instancia de LlmResponse
   */
  static create(props: LlmResponsePrimitives): LlmResponse {
    if (!props.content || props.content.trim().length === 0) {
      throw new Error('El contenido de la respuesta no puede estar vacío');
    }

    return new LlmResponse(
      props.content.trim(),
      props.model,
      props.tokensUsed,
      props.processingTimeMs,
      props.confidence ?? null,
      props.finishReason ?? null,
    );
  }

  /**
   * Reconstruye desde primitivos
   */
  static fromPrimitives(data: LlmResponsePrimitives): LlmResponse {
    return new LlmResponse(
      data.content,
      data.model,
      data.tokensUsed,
      data.processingTimeMs,
      data.confidence ?? null,
      data.finishReason ?? null,
    );
  }

  /**
   * Serializa a primitivos
   */
  toPrimitives(): LlmResponsePrimitives {
    return {
      content: this._content,
      model: this._model,
      tokensUsed: this._tokensUsed,
      processingTimeMs: this._processingTimeMs,
      confidence: this._confidence ?? undefined,
      finishReason: this._finishReason ?? undefined,
    };
  }

  // Getters
  get content(): string {
    return this._content;
  }

  get model(): string {
    return this._model;
  }

  get tokensUsed(): number {
    return this._tokensUsed;
  }

  get processingTimeMs(): number {
    return this._processingTimeMs;
  }

  get confidence(): number | null {
    return this._confidence;
  }

  get finishReason(): string | null {
    return this._finishReason;
  }

  /**
   * Obtiene un resumen del contenido (primeros 100 caracteres)
   */
  getContentSummary(maxLength = 100): string {
    if (this._content.length <= maxLength) {
      return this._content;
    }
    return this._content.substring(0, maxLength) + '...';
  }

  /**
   * Verifica si la respuesta fue truncada por límite de tokens
   */
  wasTruncated(): boolean {
    return this._finishReason === 'length';
  }
}
