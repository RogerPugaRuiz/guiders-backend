/**
 * Interface del repositorio de configuración LLM
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { LlmCompanyConfig } from './value-objects/llm-company-config';

/**
 * Interface del repositorio de configuración LLM
 */
export interface ILlmConfigRepository {
  /**
   * Guarda o actualiza la configuración de una empresa
   */
  save(config: LlmCompanyConfig): Promise<Result<void, DomainError>>;

  /**
   * Busca la configuración por ID de empresa
   */
  findByCompanyId(
    companyId: string,
  ): Promise<Result<LlmCompanyConfig, DomainError>>;

  /**
   * Elimina la configuración de una empresa
   */
  delete(companyId: string): Promise<Result<void, DomainError>>;

  /**
   * Verifica si existe configuración para una empresa
   */
  exists(companyId: string): Promise<Result<boolean, DomainError>>;
}

/** Símbolo para inyección de dependencias */
export const LLM_CONFIG_REPOSITORY = Symbol('LlmConfigRepository');
