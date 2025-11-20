import { Result } from 'src/context/shared/domain/result';
import { Commercial } from './commercial.aggregate';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { CommercialId } from './value-objects/commercial-id';
import { CommercialConnectionStatus } from './value-objects/commercial-connection-status';

/**
 * Símbolo para inyección de dependencias del repositorio de comerciales
 */
export const COMMERCIAL_REPOSITORY = Symbol('CommercialRepository');

/**
 * Interfaz del repositorio de dominio para Commercial
 * Define los métodos principales del repositorio de comerciales
 */
export interface CommercialRepository {
  /**
   * Guarda un comercial
   */
  save(commercial: Commercial): Promise<Result<void, DomainError>>;

  /**
   * Busca un comercial por su ID
   */
  findById(id: CommercialId): Promise<Result<Commercial | null, DomainError>>;

  /**
   * Busca todos los comerciales
   */
  findAll(): Promise<Result<Commercial[], DomainError>>;

  /**
   * Actualiza un comercial existente
   */
  update(commercial: Commercial): Promise<Result<void, DomainError>>;

  /**
   * Elimina un comercial por su ID
   */
  delete(id: CommercialId): Promise<Result<void, DomainError>>;

  /**
   * Busca comerciales por estado de conexión
   */
  findByConnectionStatus(
    status: CommercialConnectionStatus,
  ): Promise<Result<Commercial[], DomainError>>;

  /**
   * Busca comerciales activos (no expirados)
   */
  findActiveCommercials(
    timeoutMinutes?: number,
  ): Promise<Result<Commercial[], DomainError>>;
}
