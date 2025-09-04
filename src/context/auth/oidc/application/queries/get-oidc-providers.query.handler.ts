import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { GetOidcProvidersQuery } from './get-oidc-providers.query';
import { OidcProviderRepository, OIDC_PROVIDER_REPOSITORY } from '../../domain/oidc-provider.repository';
import { OidcProviderResponseDto } from '../dtos/oidc-provider-response.dto';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

@Injectable()
@QueryHandler(GetOidcProvidersQuery)
export class GetOidcProvidersQueryHandler implements IQueryHandler<GetOidcProvidersQuery> {
  constructor(
    @Inject(OIDC_PROVIDER_REPOSITORY)
    private readonly repository: OidcProviderRepository,
  ) {}

  async execute(query: GetOidcProvidersQuery): Promise<Result<OidcProviderResponseDto[], DomainError>> {
    const providersResult = query.enabledOnly
      ? await this.repository.findEnabled()
      : await this.repository.findAll();

    if (providersResult.isErr()) {
      return Result.err(providersResult.error);
    }

    const providers = providersResult.value.map(provider => {
      const primitives = provider.toPrimitives();
      return {
        id: primitives.id,
        name: primitives.name,
        clientId: primitives.clientId,
        issuerUrl: primitives.issuerUrl,
        scopes: primitives.scopes,
        enabled: primitives.enabled,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      };
    });

    return Result.ok(providers);
  }
}