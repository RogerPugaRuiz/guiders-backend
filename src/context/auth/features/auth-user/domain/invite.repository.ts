import { Invite } from './invite';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Criteria } from 'src/context/shared/domain/criteria';

// Interfaz del repositorio de Invite siguiendo DDD
export interface InviteRepository {
  save(invite: Invite): Promise<Result<void, DomainError>>;
  findById(id: Uuid): Promise<Result<Invite, DomainError>>;
  findAll(): Promise<Result<Invite[], DomainError>>;
  delete(id: Uuid): Promise<Result<void, DomainError>>;
  update(invite: Invite): Promise<Result<void, DomainError>>;
  findOne(criteria: Criteria<Invite>): Promise<Result<Invite, DomainError>>;
  match(criteria: Criteria<Invite>): Promise<Result<Invite[], DomainError>>;
}

// Símbolo para la inyección de dependencias
export const INVITE_REPOSITORY = Symbol('InviteRepository');
