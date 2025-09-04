import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { InitiateOidcAuthenticationCommand } from './initiate-oidc-authentication.command';
import { OidcProviderRepository, OIDC_PROVIDER_REPOSITORY } from '../../domain/oidc-provider.repository';
import { OidcClientService, OIDC_CLIENT_SERVICE } from '../services/oidc-client.service';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

export interface OidcAuthenticationInitiated {
  authUrl: string;
  state: string;
  provider: string;
}

@Injectable()
@CommandHandler(InitiateOidcAuthenticationCommand)
export class InitiateOidcAuthenticationCommandHandler implements ICommandHandler<InitiateOidcAuthenticationCommand> {
  constructor(
    @Inject(OIDC_PROVIDER_REPOSITORY)
    private readonly repository: OidcProviderRepository,
    @Inject(OIDC_CLIENT_SERVICE)
    private readonly oidcClient: OidcClientService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: InitiateOidcAuthenticationCommand): Promise<Result<OidcAuthenticationInitiated, DomainError>> {
    // Buscar el proveedor OIDC
    const providerResult = await this.repository.findByName(command.providerName);
    if (providerResult.isErr()) {
      return Result.err(
        new DomainError(`Proveedor OIDC "${command.providerName}" no encontrado`),
      );
    }

    const provider = providerResult.value;
    if (!provider.enabled) {
      return Result.err(
        new DomainError(`Proveedor OIDC "${command.providerName}" está deshabilitado`),
      );
    }

    try {
      // Generar URL de redirección por defecto si no se proporciona
      const redirectUri = command.redirectUrl || `${process.env.APP_URL}/auth/oidc/callback`;
      
      // Generar URL de autenticación
      const authData = await this.oidcClient.generateAuthenticationUrl(provider, redirectUri);

      // Emitir evento de inicio de autenticación
      const providerContext = this.publisher.mergeObjectContext(provider);
      provider.startAuthentication(redirectUri);
      providerContext.commit();

      return Result.ok({
        authUrl: authData.authUrl,
        state: authData.state,
        provider: provider.name,
      });
    } catch (error) {
      return Result.err(
        new DomainError(`Error al iniciar autenticación OIDC: ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }
}