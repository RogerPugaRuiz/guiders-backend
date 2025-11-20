import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SyncUserWithKeycloakCommand } from './sync-user-with-keycloak.command';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/user-account.repository';
import { UserAccount } from '../../domain/user-account.aggregate';
import { UserAccountEmail } from '../../domain/user-account-email';
import { UserAccountName } from '../../domain/value-objects/user-account-name';
import { UserAccountPassword } from '../../domain/user-account-password';
import { UserAccountKeycloakId } from '../../domain/value-objects/user-account-keycloak-id';
import { UserAccountCompanyId } from '../../domain/value-objects/user-account-company-id';
import { UserAccountRoles } from '../../domain/value-objects/user-account-roles';
import { KeycloakRoleMapperService } from '../services/keycloak-role-mapper.service';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

export class EmailAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`Ya existe un usuario con el email ${email}`);
  }
}

export class KeycloakIdAlreadyLinkedError extends DomainError {
  constructor(keycloakId: string) {
    super(`El Keycloak ID ${keycloakId} ya está vinculado a otro usuario`);
  }
}

@CommandHandler(SyncUserWithKeycloakCommand)
export class SyncUserWithKeycloakCommandHandler
  implements ICommandHandler<SyncUserWithKeycloakCommand>
{
  private readonly logger = new Logger(SyncUserWithKeycloakCommandHandler.name);

  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    private readonly publisher: EventPublisher,
    private readonly roleMapper: KeycloakRoleMapperService,
  ) {}

  async execute(
    command: SyncUserWithKeycloakCommand,
  ): Promise<Result<{ userId: string }, DomainError>> {
    try {
      // 1. Mapear roles de Keycloak a roles del backend
      const roleMappingResult = this.roleMapper.mapRoles(command.roles);

      // 2. Log de roles procesados
      if (roleMappingResult.invalidRoles.length > 0) {
        this.logger.warn(
          `Roles de Keycloak ignorados para ${command.email}:`,
          roleMappingResult.invalidRoles,
        );
      }

      if (roleMappingResult.mappedRoles.length > 0) {
        this.logger.log(
          `Roles mapeados para ${command.email}:`,
          roleMappingResult.mappedRoles,
        );
      }

      // 3. Verificar si ya existe un usuario con este email
      const existingUser = await this.userRepository.findByEmail(command.email);

      // 4. Verificar si el Keycloak ID ya está en uso
      const keycloakId = UserAccountKeycloakId.fromString(command.keycloakId);
      const userWithKeycloakId =
        await this.userRepository.findByKeycloakId(keycloakId);

      if (userWithKeycloakId) {
        return err(new KeycloakIdAlreadyLinkedError(command.keycloakId));
      }

      let user: UserAccount;

      if (existingUser) {
        // 5a. Si el usuario existe, solo vincularlo con Keycloak
        if (existingUser.isLinkedWithKeycloak()) {
          return err(new EmailAlreadyExistsError(command.email));
        }

        user = existingUser.linkWithKeycloak(keycloakId);
        this.logger.log(
          `Usuario existente ${command.email} vinculado con Keycloak ID ${command.keycloakId}`,
        );
      } else {
        // 5b. Si no existe, crear nuevo usuario vinculado con Keycloak usando roles mapeados
        user = UserAccount.create({
          email: UserAccountEmail.create(command.email),
          name: new UserAccountName(command.name),
          password: UserAccountPassword.empty(), // Sin contraseña, autenticación via Keycloak
          companyId: UserAccountCompanyId.create(command.companyId),
          roles: UserAccountRoles.fromRoles(roleMappingResult.validRoles),
          keycloakId: keycloakId,
        });

        this.logger.log(
          `Nuevo usuario ${command.email} creado con roles mapeados: ${roleMappingResult.validRoles.map((r) => r.toPrimitives()).join(', ')}`,
        );
      }

      // 4. Guardar el usuario
      const userCtx = this.publisher.mergeObjectContext(user);
      await this.userRepository.save(userCtx);
      userCtx.commit();

      return ok({ userId: user.id.getValue() });
    } catch (error) {
      this.logger.error(
        `Error sincronizando usuario con Keycloak: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
