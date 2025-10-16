import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindUserByIdQuery } from './find-user-by-id.query';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from '../../domain/user-account.repository';
import { UserAccount } from '../../domain/user-account.aggregate';

/**
 * Handler para la query FindUserByIdQuery
 * Obtiene un usuario específico por su ID
 */
@QueryHandler(FindUserByIdQuery)
export class FindUserByIdQueryHandler
  implements IQueryHandler<FindUserByIdQuery, UserAccount | null>
{
  private readonly logger = new Logger(FindUserByIdQueryHandler.name);

  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
  ) {}

  async execute(query: FindUserByIdQuery): Promise<UserAccount | null> {
    try {
      this.logger.log(`[FindUserByIdQuery] Buscando usuario con ID: ${query.userId}`);
      const user = await this.userRepository.findById(query.userId);

      if (user) {
        this.logger.log(`[FindUserByIdQuery] ✓ Usuario encontrado: ID=${query.userId}, Name=${user.name.value}, Email=${user.email.value}`);
      } else {
        this.logger.warn(`[FindUserByIdQuery] ✗ Usuario con ID ${query.userId} NO ENCONTRADO en la base de datos`);
      }

      return user;
    } catch (error) {
      this.logger.error(
        `[FindUserByIdQuery] ERROR al buscar usuario ${query.userId}:`,
        error,
      );
      return null;
    }
  }
}
