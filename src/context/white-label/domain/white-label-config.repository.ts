/**
 * Interface del repositorio de configuración White Label
 */

import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { WhiteLabelConfig } from './entities/white-label-config';

export interface IWhiteLabelConfigRepository {
  /**
   * Guarda o actualiza una configuración
   */
  save(config: WhiteLabelConfig): Promise<Result<void, DomainError>>;

  /**
   * Busca configuración por ID de empresa
   */
  findByCompanyId(
    companyId: string,
  ): Promise<Result<WhiteLabelConfig, DomainError>>;

  /**
   * Elimina configuración por ID de empresa
   */
  delete(companyId: string): Promise<Result<void, DomainError>>;

  /**
   * Verifica si existe configuración para una empresa
   */
  exists(companyId: string): Promise<Result<boolean, DomainError>>;
}

export const WHITE_LABEL_CONFIG_REPOSITORY = Symbol(
  'WhiteLabelConfigRepository',
);
