/**
 * Value Object para la configuración de Tools del LLM
 */

import { ToolConfigPrimitives, DEFAULT_TOOL_CONFIG } from '../tool-definitions';

/**
 * Value Object para configuración de Tools por sitio
 */
export class ToolConfig {
  private constructor(
    private readonly _fetchPageEnabled: boolean,
    private readonly _allowedPaths: string[],
    private readonly _maxIterations: number,
    private readonly _fetchTimeoutMs: number,
    private readonly _cacheEnabled: boolean,
    private readonly _cacheTtlSeconds: number,
    private readonly _baseUrl: string | undefined,
  ) {}

  /**
   * Crea una configuración con valores por defecto
   */
  static createDefault(): ToolConfig {
    return new ToolConfig(
      DEFAULT_TOOL_CONFIG.fetchPageEnabled,
      DEFAULT_TOOL_CONFIG.allowedPaths || [],
      DEFAULT_TOOL_CONFIG.maxIterations,
      DEFAULT_TOOL_CONFIG.fetchTimeoutMs,
      DEFAULT_TOOL_CONFIG.cacheEnabled,
      DEFAULT_TOOL_CONFIG.cacheTtlSeconds,
      DEFAULT_TOOL_CONFIG.baseUrl,
    );
  }

  /**
   * Crea una configuración desde primitivos
   */
  static create(props: Partial<ToolConfigPrimitives>): ToolConfig {
    return new ToolConfig(
      props.fetchPageEnabled ?? DEFAULT_TOOL_CONFIG.fetchPageEnabled,
      props.allowedPaths ?? DEFAULT_TOOL_CONFIG.allowedPaths ?? [],
      props.maxIterations ?? DEFAULT_TOOL_CONFIG.maxIterations,
      props.fetchTimeoutMs ?? DEFAULT_TOOL_CONFIG.fetchTimeoutMs,
      props.cacheEnabled ?? DEFAULT_TOOL_CONFIG.cacheEnabled,
      props.cacheTtlSeconds ?? DEFAULT_TOOL_CONFIG.cacheTtlSeconds,
      props.baseUrl ?? DEFAULT_TOOL_CONFIG.baseUrl,
    );
  }

  /**
   * Reconstruye desde primitivos
   */
  static fromPrimitives(
    data: ToolConfigPrimitives | null | undefined,
  ): ToolConfig {
    if (!data) {
      return ToolConfig.createDefault();
    }
    return ToolConfig.create(data);
  }

  /**
   * Serializa a primitivos
   */
  toPrimitives(): ToolConfigPrimitives {
    return {
      fetchPageEnabled: this._fetchPageEnabled,
      allowedPaths: this._allowedPaths,
      maxIterations: this._maxIterations,
      fetchTimeoutMs: this._fetchTimeoutMs,
      cacheEnabled: this._cacheEnabled,
      cacheTtlSeconds: this._cacheTtlSeconds,
      baseUrl: this._baseUrl,
    };
  }

  // Getters
  get fetchPageEnabled(): boolean {
    return this._fetchPageEnabled;
  }

  get allowedPaths(): string[] {
    return this._allowedPaths;
  }

  get maxIterations(): number {
    return this._maxIterations;
  }

  get fetchTimeoutMs(): number {
    return this._fetchTimeoutMs;
  }

  get cacheEnabled(): boolean {
    return this._cacheEnabled;
  }

  get cacheTtlSeconds(): number {
    return this._cacheTtlSeconds;
  }

  get baseUrl(): string | undefined {
    return this._baseUrl;
  }

  /**
   * Verifica si alguna tool está habilitada
   */
  hasAnyToolEnabled(): boolean {
    return this._fetchPageEnabled;
  }

  /**
   * Verifica si un path está permitido
   * Si allowedPaths está vacío, todos los paths están permitidos
   */
  isPathAllowed(path: string): boolean {
    if (this._allowedPaths.length === 0) {
      return true;
    }

    // Normalizar path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return this._allowedPaths.some((allowed) => {
      const normalizedAllowed = allowed.startsWith('/')
        ? allowed
        : `/${allowed}`;
      return normalizedPath.startsWith(normalizedAllowed);
    });
  }

  /**
   * Crea una copia con propiedades actualizadas
   */
  update(updates: Partial<ToolConfigPrimitives>): ToolConfig {
    return new ToolConfig(
      updates.fetchPageEnabled ?? this._fetchPageEnabled,
      updates.allowedPaths ?? this._allowedPaths,
      updates.maxIterations ?? this._maxIterations,
      updates.fetchTimeoutMs ?? this._fetchTimeoutMs,
      updates.cacheEnabled ?? this._cacheEnabled,
      updates.cacheTtlSeconds ?? this._cacheTtlSeconds,
      updates.baseUrl !== undefined ? updates.baseUrl : this._baseUrl,
    );
  }
}
