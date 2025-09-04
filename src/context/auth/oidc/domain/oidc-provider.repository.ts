import { OidcProvider } from './oidc-provider';
import { OidcProviderId } from './value-objects/oidc-provider-id';
import { Criteria } from 'src/context/shared/domain/criteria';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Result } from 'src/context/shared/domain/result';

export const OIDC_PROVIDER_REPOSITORY = Symbol('OidcProviderRepository');

export interface OidcProviderRepository {
  save(provider: OidcProvider): Promise<Result<void, DomainError>>;
  findById(id: OidcProviderId): Promise<Result<OidcProvider, DomainError>>;
  findByName(name: string): Promise<Result<OidcProvider, DomainError>>;
  findAll(): Promise<Result<OidcProvider[], DomainError>>;
  findEnabled(): Promise<Result<OidcProvider[], DomainError>>;
  delete(id: OidcProviderId): Promise<Result<void, DomainError>>;
  update(provider: OidcProvider): Promise<Result<void, DomainError>>;
  findOne(criteria: Criteria<OidcProvider>): Promise<Result<OidcProvider, DomainError>>;
  match(criteria: Criteria<OidcProvider>): Promise<Result<OidcProvider[], DomainError>>;
}