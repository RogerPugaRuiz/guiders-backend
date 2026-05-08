import { SearchResult } from './search-result.vo';
import { SearchScope } from './search-scope.enum';

/**
 * Parámetros de entrada para la búsqueda.
 */
export interface SearchParams {
  /** Término de búsqueda del usuario */
  query: string;
  /** ID del tenant (companyId) para filtrar resultados */
  companyId: string;
  /** ID del agente autenticado (solo relevante para rol commercial) */
  agentId?: string;
  /** Número máximo de resultados por provider (default: 5) */
  limit?: number;
}

/**
 * Contrato que debe implementar cada proveedor de búsqueda.
 * Cada contexto de dominio exporta su propio provider registrado con el token SEARCH_PROVIDER.
 */
export interface SearchProvider {
  /**
   * Ámbitos que cubre este provider.
   * El handler filtra los providers activos según el rol del usuario.
   */
  readonly scope: SearchScope[];

  /**
   * Ejecuta la búsqueda en el contexto de dominio correspondiente.
   * DEBE capturar sus propios errores y retornar [] en caso de fallo
   * para no afectar al resto de providers.
   */
  search(params: SearchParams): Promise<SearchResult[]>;
}

/** Token de inyección multi-provider para NestJS */
export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');
