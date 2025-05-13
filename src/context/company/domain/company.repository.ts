// Interfaz del repositorio de Company para DDD
import { Company } from './company';
import { Uuid } from '../../shared/domain/value-objects/uuid';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
export const COMPANY_REPOSITORY = Symbol('CompanyRepository');
// Define los métodos principales del repositorio de empresas
export interface CompanyRepository {
  save(company: Company): Promise<Result<void, DomainError>>;
  findById(id: Uuid): Promise<Result<Company, DomainError>>;
  delete(id: Uuid): Promise<Result<void, DomainError>>;
  findAll(): Promise<Result<Company[], DomainError>>;
  // Otros métodos según necesidades del dominio
}
