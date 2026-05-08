/**
 * Value Object que representa un resultado individual de búsqueda global.
 * Contiene los datos mínimos necesarios para renderizar un resultado en la UI.
 */
export interface SearchResultPrimitives {
  id: string;
  scope: string;
  title: string;
  subtitle?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export class SearchResult {
  private constructor(
    public readonly id: string,
    public readonly scope: string,
    public readonly title: string,
    public readonly subtitle: string | undefined,
    public readonly url: string | undefined,
    public readonly metadata: Record<string, unknown> | undefined,
  ) {}

  public static create(primitives: SearchResultPrimitives): SearchResult {
    return new SearchResult(
      primitives.id,
      primitives.scope,
      primitives.title,
      primitives.subtitle,
      primitives.url,
      primitives.metadata,
    );
  }

  public toPrimitives(): SearchResultPrimitives {
    return {
      id: this.id,
      scope: this.scope,
      title: this.title,
      subtitle: this.subtitle,
      url: this.url,
      metadata: this.metadata,
    };
  }
}
