/**
 * Value Object para la configuración de LLM por sitio
 */

/**
 * Primitivos de la configuración LLM
 */
export interface LlmSiteConfigPrimitives {
  siteId: string;
  companyId: string;
  aiAutoResponseEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  aiRespondWithCommercial: boolean;
  preferredProvider: string;
  preferredModel: string;
  customSystemPrompt?: string | null;
  maxResponseTokens: number;
  temperature: number;
  responseDelayMs: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Value Object para configuración de LLM por sitio
 */
export class LlmSiteConfig {
  private constructor(
    private readonly _siteId: string,
    private readonly _companyId: string,
    private readonly _aiAutoResponseEnabled: boolean,
    private readonly _aiSuggestionsEnabled: boolean,
    private readonly _aiRespondWithCommercial: boolean,
    private readonly _preferredProvider: string,
    private readonly _preferredModel: string,
    private readonly _customSystemPrompt: string | null,
    private readonly _maxResponseTokens: number,
    private readonly _temperature: number,
    private readonly _responseDelayMs: number,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {}

  /**
   * Crea una nueva configuración con valores por defecto
   */
  static createDefault(siteId: string, companyId: string): LlmSiteConfig {
    const now = new Date();
    return new LlmSiteConfig(
      siteId,
      companyId,
      false, // aiAutoResponseEnabled - desactivado por defecto
      false, // aiSuggestionsEnabled - desactivado por defecto
      false, // aiRespondWithCommercial
      'groq', // preferredProvider
      'llama-3.3-70b-versatile', // preferredModel
      null, // customSystemPrompt
      500, // maxResponseTokens
      0.7, // temperature
      1000, // responseDelayMs
      now,
      now,
    );
  }

  /**
   * Crea una configuración desde primitivos
   */
  static create(props: LlmSiteConfigPrimitives): LlmSiteConfig {
    return new LlmSiteConfig(
      props.siteId,
      props.companyId,
      props.aiAutoResponseEnabled,
      props.aiSuggestionsEnabled,
      props.aiRespondWithCommercial,
      props.preferredProvider,
      props.preferredModel,
      props.customSystemPrompt ?? null,
      props.maxResponseTokens,
      props.temperature,
      props.responseDelayMs,
      props.createdAt || new Date(),
      props.updatedAt || new Date(),
    );
  }

  /**
   * Reconstruye desde primitivos
   */
  static fromPrimitives(data: LlmSiteConfigPrimitives): LlmSiteConfig {
    return LlmSiteConfig.create(data);
  }

  /**
   * Serializa a primitivos
   */
  toPrimitives(): LlmSiteConfigPrimitives {
    return {
      siteId: this._siteId,
      companyId: this._companyId,
      aiAutoResponseEnabled: this._aiAutoResponseEnabled,
      aiSuggestionsEnabled: this._aiSuggestionsEnabled,
      aiRespondWithCommercial: this._aiRespondWithCommercial,
      preferredProvider: this._preferredProvider,
      preferredModel: this._preferredModel,
      customSystemPrompt: this._customSystemPrompt,
      maxResponseTokens: this._maxResponseTokens,
      temperature: this._temperature,
      responseDelayMs: this._responseDelayMs,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  // Getters
  get siteId(): string {
    return this._siteId;
  }

  get companyId(): string {
    return this._companyId;
  }

  get aiAutoResponseEnabled(): boolean {
    return this._aiAutoResponseEnabled;
  }

  get aiSuggestionsEnabled(): boolean {
    return this._aiSuggestionsEnabled;
  }

  get aiRespondWithCommercial(): boolean {
    return this._aiRespondWithCommercial;
  }

  get preferredProvider(): string {
    return this._preferredProvider;
  }

  get preferredModel(): string {
    return this._preferredModel;
  }

  get customSystemPrompt(): string | null {
    return this._customSystemPrompt;
  }

  get maxResponseTokens(): number {
    return this._maxResponseTokens;
  }

  get temperature(): number {
    return this._temperature;
  }

  get responseDelayMs(): number {
    return this._responseDelayMs;
  }

  /**
   * Verifica si la IA debe responder automáticamente
   */
  shouldAutoRespond(hasCommercialAssigned: boolean): boolean {
    if (!this._aiAutoResponseEnabled) {
      return false;
    }

    // Si hay comercial asignado, solo responder si está habilitado
    if (hasCommercialAssigned) {
      return this._aiRespondWithCommercial;
    }

    return true;
  }

  /**
   * Crea una copia con propiedades actualizadas
   */
  update(updates: Partial<LlmSiteConfigPrimitives>): LlmSiteConfig {
    return new LlmSiteConfig(
      this._siteId,
      this._companyId,
      updates.aiAutoResponseEnabled ?? this._aiAutoResponseEnabled,
      updates.aiSuggestionsEnabled ?? this._aiSuggestionsEnabled,
      updates.aiRespondWithCommercial ?? this._aiRespondWithCommercial,
      updates.preferredProvider ?? this._preferredProvider,
      updates.preferredModel ?? this._preferredModel,
      updates.customSystemPrompt !== undefined
        ? (updates.customSystemPrompt ?? null)
        : this._customSystemPrompt,
      updates.maxResponseTokens ?? this._maxResponseTokens,
      updates.temperature ?? this._temperature,
      updates.responseDelayMs ?? this._responseDelayMs,
      this._createdAt,
      new Date(),
    );
  }
}
