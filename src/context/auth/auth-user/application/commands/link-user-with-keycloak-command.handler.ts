import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { LinkUserWithKeycloakCommand } from './link-user-with-keycloak.command';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/user-account.repository';
import { UserAccountKeycloakId } from '../../domain/value-objects/user-account-keycloak-id';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`Usuario con ID ${userId} no encontrado`);
  }
}

export class UserAlreadyLinkedError extends DomainError {
  constructor(userId: string) {
    super(`Usuario con ID ${userId} ya está vinculado con Keycloak`);
  }
}

export class KeycloakIdAlreadyUsedError extends DomainError {
  constructor(keycloakId: string) {
    super(`El Keycloak ID ${keycloakId} ya está en uso por otro usuario`);
  }
}

@CommandHandler(LinkUserWithKeycloakCommand)
export class LinkUserWithKeycloakCommandHandler
  implements ICommandHandler<LinkUserWithKeycloakCommand>
{
  private readonly logger = new Logger(LinkUserWithKeycloakCommandHandler.name);

  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: LinkUserWithKeycloakCommand,
  ): Promise<Result<void, DomainError>> {
    try {
      // 1. Buscar el usuario por ID
      const user = await this.userRepository.findById(command.userId);
      if (!user) {
        return err(new UserNotFoundError(command.userId));
      }

      // 2. Verificar si el usuario ya está vinculado con Keycloak
      if (user.isLinkedWithKeycloak()) {
        return err(new UserAlreadyLinkedError(command.userId));
      }

      // 3. Verificar si el Keycloak ID ya está en uso
      const keycloakId = UserAccountKeycloakId.fromString(command.keycloakId);
      const existingUser =
        await this.userRepository.findByKeycloakId(keycloakId);
      if (existingUser) {
        return err(new KeycloakIdAlreadyUsedError(command.keycloakId));
      }

      // 4. Vincular el usuario con Keycloak
      const linkedUser = user.linkWithKeycloak(keycloakId);

      // 5. Usar EventPublisher para eventos de dominio
      const userCtx = this.publisher.mergeObjectContext(linkedUser);
      await this.userRepository.save(userCtx);
      userCtx.commit();

      this.logger.log(
        `Usuario ${command.userId} vinculado exitosamente con Keycloak ID ${command.keycloakId}`,
      );

      return ok(undefined);
    } catch (error) {
      this.logger.error(
        `Error vinculando usuario con Keycloak: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
