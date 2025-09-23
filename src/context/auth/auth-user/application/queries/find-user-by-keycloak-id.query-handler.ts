import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindUserByKeycloakIdQuery } from './find-user-by-keycloak-id.query';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/user-account.repository';
import { UserAccountKeycloakId } from '../../domain/value-objects/user-account-keycloak-id';
import { UserResponseDto } from '../dtos/user-list-response.dto';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

export class UserNotFoundByKeycloakIdError extends DomainError {
  constructor(keycloakId: string) {
    super(`Usuario con Keycloak ID ${keycloakId} no encontrado`);
  }
}

@QueryHandler(FindUserByKeycloakIdQuery)
export class FindUserByKeycloakIdQueryHandler
  implements IQueryHandler<FindUserByKeycloakIdQuery>
{
  private readonly logger = new Logger(FindUserByKeycloakIdQueryHandler.name);

  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
  ) {}

  async execute(
    query: FindUserByKeycloakIdQuery,
  ): Promise<Result<UserResponseDto, DomainError>> {
    try {
      const keycloakId = UserAccountKeycloakId.fromString(query.keycloakId);
      const user = await this.userRepository.findByKeycloakId(keycloakId);

      if (!user) {
        return err(new UserNotFoundByKeycloakIdError(query.keycloakId));
      }

      const userDto: UserResponseDto = {
        id: user.id.getValue(),
        email: user.email.getValue(),
        name: user.name.getValue(),
        roles: user.roles.toPrimitives(),
        companyId: user.companyId.getValue(),
        isActive: user.isActive,
        keycloakId: user.keycloakId.getOrNull()?.value ?? null,
        createdAt: user.createdAt.getValue(),
        lastLoginAt: user.lastLoginAt.getOrNull(),
      };

      return ok(userDto);
    } catch (error) {
      this.logger.error(
        `Error buscando usuario por Keycloak ID: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
