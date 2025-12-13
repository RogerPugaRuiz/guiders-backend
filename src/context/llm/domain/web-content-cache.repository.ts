/**
 * Interface del repositorio de cache de contenido web
 * Permite cachear el contenido extraído de páginas web para evitar requests repetidos
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Datos de contenido web cacheado
 */
export interface CachedWebContent {
  /** URL completa de la página */
  url: string;
  /** ID de la compañía */
  companyId: string;
  /** Contenido en Markdown */
  content: string;
  /** Tamaño original del contenido */
  originalSize: number;
  /** Si el contenido fue truncado */
  truncated: boolean;
  /** Tiempo que tomó el fetch en ms */
  fetchTimeMs: number;
  /** Fecha de creación del cache */
  createdAt: Date;
  /** Fecha de expiración */
  expiresAt: Date;
}

/**
 * Interface del repositorio de cache de contenido web
 */
export interface IWebContentCacheRepository {
  /**
   * Busca contenido cacheado por URL y compañía
   * @param url URL de la página
   * @param companyId ID de la empresa
   * @returns Contenido cacheado o null si no existe/expiró
   */
  findByUrlAndCompany(
    url: string,
    companyId: string,
  ): Promise<Result<CachedWebContent | null, DomainError>>;

  /**
   * Guarda o actualiza contenido en cache
   * @param content Datos del contenido a cachear
   */
  save(content: CachedWebContent): Promise<Result<void, DomainError>>;

  /**
   * Elimina contenido cacheado por URL y compañía
   * @param url URL de la página
   * @param companyId ID de la empresa
   */
  delete(url: string, companyId: string): Promise<Result<void, DomainError>>;

  /**
   * Elimina todo el cache de una compañía
   * @param companyId ID de la empresa
   */
  deleteByCompany(companyId: string): Promise<Result<number, DomainError>>;

  /**
   * Elimina entradas expiradas manualmente (además del TTL automático)
   * @returns Número de entradas eliminadas
   */
  deleteExpired(): Promise<Result<number, DomainError>>;
}

/** Símbolo para inyección de dependencias */
export const WEB_CONTENT_CACHE_REPOSITORY = Symbol('WebContentCacheRepository');
