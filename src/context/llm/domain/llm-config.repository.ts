/**
 * Interface del repositorio de configuración LLM
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { LlmSiteConfig } from './value-objects/llm-site-config';

/**
 * Interface del repositorio de configuración LLM
 */
export interface ILlmConfigRepository {
  /**
   * Guarda o actualiza la configuración de un sitio
   */
  save(config: LlmSiteConfig): Promise<Result<void, DomainError>>;

  /**
   * Busca la configuración por ID de sitio
   */
  findBySiteId(siteId: string): Promise<Result<LlmSiteConfig, DomainError>>;

  /**
   * Busca todas las configuraciones de una compañía
   */
  findByCompanyId(
    companyId: string,
  ): Promise<Result<LlmSiteConfig[], DomainError>>;

  /**
   * Elimina la configuración de un sitio
   */
  delete(siteId: string): Promise<Result<void, DomainError>>;

  /**
   * Verifica si existe configuración para un sitio
   */
  exists(siteId: string): Promise<Result<boolean, DomainError>>;
}

/** Símbolo para inyección de dependencias */
export const LLM_CONFIG_REPOSITORY = Symbol('LlmConfigRepository');
