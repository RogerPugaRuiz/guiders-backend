import { Result } from 'src/context/shared/domain/result';
import { Visitor } from './visitor.aggregate';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { VisitorId } from './value-objects/visitor-id';
import { Criteria } from 'src/context/shared/domain/criteria';

export const VISITOR_REPOSITORY = Symbol('VisitorRepository');

export interface IVisitorRepository {
  // Método para agregar un visitante
  save(visitor: Visitor): Promise<Result<void, DomainError>>;

  findById(visitorId: VisitorId): Promise<Result<Visitor, DomainError>>;

  match(criteria: Criteria<Visitor>): Promise<Result<Visitor[], DomainError>>;
}
