/**
 * Value Object que representa el contexto completo para el LLM
 */

import { LlmMessage } from '../services/llm-provider.service';

/**
 * Información del visitante para contexto
 */
export interface VisitorContextData {
  /** Nombre del visitante si está identificado */
  name?: string;
  /** Email del visitante si está disponible */
  email?: string;
  /** URL de la página actual */
  currentUrl?: string;
  /** Título de la página actual */
  currentPageTitle?: string;
  /** Etapa del ciclo de vida (ANON, KNOWN, LEAD, etc.) */
  lifecycle?: string;
  /** País del visitante */
  country?: string;
  /** Ciudad del visitante */
  city?: string;
  /** Dispositivo (desktop, mobile, tablet) */
  device?: string;
  /** Navegador */
  browser?: string;
  /** Número de visitas */
  visitCount?: number;
  /** Tiempo en el sitio (segundos) */
  timeOnSite?: number;
  /** Datos adicionales */
  customData?: Record<string, unknown>;
}

/**
 * Información de la empresa para contexto
 */
export interface CompanyContextData {
  /** Nombre de la empresa */
  name?: string;
  /** Dominio del sitio */
  domain?: string;
  /** Descripción de la empresa/producto */
  description?: string;
  /** Sector/industria */
  industry?: string;
  /** Información adicional de producto */
  productInfo?: string;
  /** FAQs predefinidas */
  faqs?: Array<{ question: string; answer: string }>;
}

/**
 * Primitivos del contexto LLM
 */
export interface LlmContextPrimitives {
  systemPrompt: string;
  conversationHistory: LlmMessage[];
  visitorContext?: VisitorContextData;
  companyContext?: CompanyContextData;
}

/**
 * Value Object para el contexto del LLM
 */
export class LlmContext {
  private constructor(
    private readonly _systemPrompt: string,
    private readonly _conversationHistory: LlmMessage[],
    private readonly _visitorContext: VisitorContextData | null,
    private readonly _companyContext: CompanyContextData | null,
  ) {}

  /**
   * Crea una nueva instancia de LlmContext
   */
  static create(props: LlmContextPrimitives): LlmContext {
    return new LlmContext(
      props.systemPrompt,
      props.conversationHistory,
      props.visitorContext ?? null,
      props.companyContext ?? null,
    );
  }

  /**
   * Reconstruye desde primitivos
   */
  static fromPrimitives(data: LlmContextPrimitives): LlmContext {
    return new LlmContext(
      data.systemPrompt,
      data.conversationHistory,
      data.visitorContext ?? null,
      data.companyContext ?? null,
    );
  }

  /**
   * Serializa a primitivos
   */
  toPrimitives(): LlmContextPrimitives {
    return {
      systemPrompt: this._systemPrompt,
      conversationHistory: [...this._conversationHistory],
      visitorContext: this._visitorContext ?? undefined,
      companyContext: this._companyContext ?? undefined,
    };
  }

  // Getters
  get systemPrompt(): string {
    return this._systemPrompt;
  }

  get conversationHistory(): LlmMessage[] {
    return [...this._conversationHistory];
  }

  get visitorContext(): VisitorContextData | null {
    return this._visitorContext;
  }

  get companyContext(): CompanyContextData | null {
    return this._companyContext;
  }

  /**
   * Obtiene el prompt del sistema enriquecido con contexto
   */
  getEnrichedSystemPrompt(): string {
    let enrichedPrompt = this._systemPrompt;

    if (this._visitorContext) {
      enrichedPrompt += '\n\n## Información del visitante:';
      if (this._visitorContext.name) {
        enrichedPrompt += `\n- Nombre: ${this._visitorContext.name}`;
      }
      if (this._visitorContext.currentUrl) {
        enrichedPrompt += `\n- Página actual: ${this._visitorContext.currentUrl}`;
      }
      if (this._visitorContext.lifecycle) {
        enrichedPrompt += `\n- Etapa: ${this._visitorContext.lifecycle}`;
      }
      if (this._visitorContext.country) {
        enrichedPrompt +=
          `\n- Ubicación: ${this._visitorContext.city || ''} ${this._visitorContext.country}`.trim();
      }
    }

    if (this._companyContext) {
      enrichedPrompt += '\n\n## Información de la empresa:';
      if (this._companyContext.name) {
        enrichedPrompt += `\n- Empresa: ${this._companyContext.name}`;
      }
      if (this._companyContext.description) {
        enrichedPrompt += `\n- Descripción: ${this._companyContext.description}`;
      }
      if (this._companyContext.productInfo) {
        enrichedPrompt += `\n- Producto: ${this._companyContext.productInfo}`;
      }
    }

    return enrichedPrompt;
  }

  /**
   * Obtiene el número total de mensajes en el historial
   */
  getHistoryLength(): number {
    return this._conversationHistory.length;
  }

  /**
   * Obtiene el último mensaje del historial
   */
  getLastMessage(): LlmMessage | null {
    if (this._conversationHistory.length === 0) {
      return null;
    }
    return this._conversationHistory[this._conversationHistory.length - 1];
  }

  /**
   * Crea un nuevo contexto con un mensaje adicional
   */
  withMessage(message: LlmMessage): LlmContext {
    return new LlmContext(
      this._systemPrompt,
      [...this._conversationHistory, message],
      this._visitorContext,
      this._companyContext,
    );
  }
}
