import { Criteria } from 'src/context/shared/domain/criteria';
import { ComercialClaim } from './comercial-claim';
import { ComercialClaimId } from './value-objects/comercial-claim-id';
import { ChatId } from '../chat/value-objects/chat-id';
import { ComercialId } from './value-objects/comercial-id';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

export const COMERCIAL_CLAIM_REPOSITORY = Symbol('COMERCIAL_CLAIM_REPOSITORY');

export interface IComercialClaimRepository {
  save(claim: ComercialClaim): Promise<Result<void, DomainError>>;
  findById(
    id: ComercialClaimId,
  ): Promise<Result<ComercialClaim | null, DomainError>>;
  findAll(): Promise<Result<ComercialClaim[], DomainError>>;
  delete(id: ComercialClaimId): Promise<Result<void, DomainError>>;
  update(claim: ComercialClaim): Promise<Result<void, DomainError>>;
  findOne(
    criteria: Criteria<ComercialClaim>,
  ): Promise<Result<ComercialClaim | null, DomainError>>;
  match(
    criteria: Criteria<ComercialClaim>,
  ): Promise<Result<ComercialClaim[], DomainError>>;

  /**
   * Obtiene los IDs de chats que tienen claims activos
   */
  getActiveChatIds(): Promise<Result<string[], DomainError>>;

  /**
   * Encuentra el claim activo para un chat específico
   */
  findActiveClaimForChat(
    chatId: ChatId,
  ): Promise<Result<ComercialClaim | null, DomainError>>;

  /**
   * Encuentra todos los claims activos de un comercial
   */
  findActiveClaimsByComercial(
    comercialId: ComercialId,
  ): Promise<Result<ComercialClaim[], DomainError>>;
}
