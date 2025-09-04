import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { CompleteOidcAuthenticationCommand } from './complete-oidc-authentication.command';
import { OidcProviderRepository, OIDC_PROVIDER_REPOSITORY } from '../../domain/oidc-provider.repository';
import { OidcClientService, OIDC_CLIENT_SERVICE } from '../services/oidc-client.service';
import { USER_TOKEN_SERVICE, UserTokenService } from 'src/context/auth/auth-user/application/service/user-token-service';
import { USER_ACCOUNT_REPOSITORY, UserAccountRepository } from 'src/context/auth/auth-user/domain/user-account.repository';
import { UserAccount } from 'src/context/auth/auth-user/domain/user-account';
import { UserAccountEmail } from 'src/context/auth/auth-user/domain/value-objects/user-account-email';
import { UserAccountName } from 'src/context/auth/auth-user/domain/value-objects/user-account-name';
import { UserAccountRoles } from 'src/context/auth/auth-user/domain/value-objects/user-account-roles';
import { Role } from 'src/context/auth/auth-user/domain/value-objects/role';
import { UserAccountCompanyId } from 'src/context/auth/auth-user/domain/value-objects/user-account-company-id';
import { UserAccountPassword } from 'src/context/auth/auth-user/domain/value-objects/user-account-password';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

export interface OidcAuthenticationCompleted {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    companyId?: string;
  };
  provider: string;
}

@Injectable()
@CommandHandler(CompleteOidcAuthenticationCommand)
export class CompleteOidcAuthenticationCommandHandler implements ICommandHandler<CompleteOidcAuthenticationCommand> {
  constructor(
    @Inject(OIDC_PROVIDER_REPOSITORY)
    private readonly repository: OidcProviderRepository,
    @Inject(OIDC_CLIENT_SERVICE)
    private readonly oidcClient: OidcClientService,
    @Inject(USER_TOKEN_SERVICE)
    private readonly tokenService: UserTokenService,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CompleteOidcAuthenticationCommand): Promise<Result<OidcAuthenticationCompleted, DomainError>> {
    try {
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

      // Intercambiar código por tokens
      const redirectUri = `${process.env.APP_URL}/auth/oidc/callback`;
      const tokens = await this.oidcClient.exchangeCodeForTokens(
        provider,
        command.code,
        redirectUri,
        command.state,
      );

      // Buscar o crear usuario basado en la información de OIDC
      const userEmail = tokens.userInfo.email;
      if (!userEmail) {
        return Result.err(
          new DomainError('El proveedor OIDC no proporcionó un email válido'),
        );
      }

      let user = await this.userRepository.findByEmail(userEmail);
      
      if (!user) {
        // Crear nuevo usuario si no existe
        const newUser = UserAccount.create({
          email: UserAccountEmail.create(userEmail),
          name: new UserAccountName(tokens.userInfo.name || tokens.userInfo.given_name || userEmail),
          roles: UserAccountRoles.create([Role.create('commercial')]), // Rol por defecto
          companyId: UserAccountCompanyId.create('default'), // TODO: Determinar compañía basada en dominio o configuración
          password: UserAccountPassword.empty(), // Sin contraseña para usuarios OIDC
        });

        const userContext = this.publisher.mergeObjectContext(newUser);
        const saveResult = await this.userRepository.save(userContext);
        
        if (saveResult.isErr()) {
          return Result.err(saveResult.error);
        }
        
        userContext.commit();
        user = newUser;
      }

      // Generar tokens JWT propios del sistema
      const jwtTokens = await this.tokenService.generate({
        id: user.id.getValue(),
        email: user.email.getValue(),
        roles: user.roles.getValue().map((role) => role.getValue()),
        companyId: user.companyId.getValue(),
      });

      // Emitir evento de autenticación completada
      const providerContext = this.publisher.mergeObjectContext(provider);
      provider.completeAuthentication(
        tokens.userInfo,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
        },
        user.id.getValue(),
      );
      providerContext.commit();

      return Result.ok({
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        user: {
          id: user.id.getValue(),
          email: user.email.getValue(),
          name: user.name.getValue(),
          roles: user.roles.getValue().map((role) => role.getValue()),
          companyId: user.companyId.getValue(),
        },
        provider: provider.name,
      });

    } catch (error) {
      // Emitir evento de fallo en autenticación
      const providerResult = await this.repository.findByName(command.providerName);
      if (providerResult.isOk()) {
        const provider = providerResult.value;
        const providerContext = this.publisher.mergeObjectContext(provider);
        provider.failAuthentication(
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined,
        );
        providerContext.commit();
      }

      return Result.err(
        new DomainError(`Error al completar autenticación OIDC: ${error instanceof Error ? error.message : String(error)}`),
      );
    }
  }
}