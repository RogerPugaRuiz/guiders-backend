import { VisitorIntent } from './visitor-intent.aggregate';
import { VisitorId } from './value-objects/visitor-id';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

// Interfaz del repositorio para VisitorIntent
export interface IIntentDetectorRepository {
  save(intent: VisitorIntent): Promise<Result<void, DomainError>>;
  findById(id: string): Promise<Result<VisitorIntent, DomainError>>;
  findAll(): Promise<Result<VisitorIntent[], DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
  update(intent: VisitorIntent): Promise<Result<void, DomainError>>;
  findOne(visitorId: VisitorId): Promise<Result<VisitorIntent, DomainError>>;
  match(criteria: any): Promise<Result<VisitorIntent[], DomainError>>;
}

// Símbolo para la inyección de dependencias
export const INTENT_DETECTOR_REPOSITORY = Symbol('IIntentDetectorRepository');
