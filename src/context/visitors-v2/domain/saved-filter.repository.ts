import { Result } from 'src/context/shared/domain/result';
import { SavedFilter } from './entities/saved-filter.aggregate';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import {
  SavedFilterPersistenceError,
  SavedFilterNotFoundError,
} from './errors/saved-filter.error';

/**
 * Interfaz del repositorio de filtros guardados
 */
export interface SavedFilterRepository {
  /**
   * Guarda un nuevo filtro o actualiza uno existente
   */
  save(filter: SavedFilter): Promise<Result<void, SavedFilterPersistenceError>>;

  /**
   * Busca un filtro por su ID
   */
  findById(
    id: Uuid,
  ): Promise<Result<SavedFilter | null, SavedFilterPersistenceError>>;

  /**
   * Busca todos los filtros de un usuario en un tenant
   */
  findByUserAndTenant(
    userId: Uuid,
    tenantId: Uuid,
  ): Promise<Result<SavedFilter[], SavedFilterPersistenceError>>;

  /**
   * Elimina un filtro por su ID
   */
  delete(
    id: Uuid,
  ): Promise<
    Result<void, SavedFilterNotFoundError | SavedFilterPersistenceError>
  >;

  /**
   * Cuenta el número de filtros guardados por un usuario
   */
  countByUser(
    userId: Uuid,
    tenantId: Uuid,
  ): Promise<Result<number, SavedFilterPersistenceError>>;
}

/**
 * Token de inyección de dependencias para el repositorio
 */
export const SAVED_FILTER_REPOSITORY = Symbol('SavedFilterRepository');
