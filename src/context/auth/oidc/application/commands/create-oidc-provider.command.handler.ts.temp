import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { CreateOidcProviderCommand } from './create-oidc-provider.command';
import { OidcProvider } from '../../domain/oidc-provider';
import { OidcProviderRepository, OIDC_PROVIDER_REPOSITORY } from '../../domain/oidc-provider.repository';
import { OidcProviderId } from '../../domain/value-objects/oidc-provider-id';
import { OidcClientId } from '../../domain/value-objects/oidc-client-id';
import { OidcClientSecret } from '../../domain/value-objects/oidc-client-secret';
import { OidcIssuerUrl } from '../../domain/value-objects/oidc-issuer-url';
import { OidcScopes } from '../../domain/value-objects/oidc-scopes';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { OidcProviderError } from '../../domain/errors/oidc.errors';

@Injectable()
@CommandHandler(CreateOidcProviderCommand)
export class CreateOidcProviderCommandHandler implements ICommandHandler<CreateOidcProviderCommand> {
  constructor(
    @Inject(OIDC_PROVIDER_REPOSITORY)
    private readonly repository: OidcProviderRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateOidcProviderCommand): Promise<Result<string, OidcProviderError>> {
    // Verificar si ya existe un proveedor con el mismo nombre
    const existingProvider = await this.repository.findByName(command.name);
    if (existingProvider.isOk()) {
      return err(
        new OidcProviderError(`Ya existe un proveedor OIDC con el nombre "${command.name}"`),
      );
    }

    // Crear el nuevo proveedor OIDC
    const provider = OidcProvider.create({
      id: OidcProviderId.create(Uuid.random().value),
      name: command.name,
      clientId: OidcClientId.create(command.clientId),
      clientSecret: OidcClientSecret.create(command.clientSecret),
      issuerUrl: OidcIssuerUrl.create(command.issuerUrl),
      scopes: OidcScopes.fromPrimitives(command.scopes),
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Guardar el proveedor usando el publisher para eventos
    const providerContext = this.publisher.mergeObjectContext(provider);
    const saveResult = await this.repository.save(providerContext);
    
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    providerContext.commit();
    return ok(provider.id.value);
  }
}