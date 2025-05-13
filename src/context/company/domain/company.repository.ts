// Interfaz del repositorio de Company para DDD
import { Company } from './company';
import { Uuid } from '../../shared/domain/value-objects/uuid';
export const COMPANY_REPOSITORY = Symbol('CompanyRepository');
// Define los métodos principales del repositorio de empresas
export interface CompanyRepository {
  save(company: Company): Promise<void>;
  findById(id: Uuid): Promise<Company | null>;
  delete(id: Uuid): Promise<void>;
  findAll(): Promise<Company[]>;
  // Otros métodos según necesidades del dominio
}
