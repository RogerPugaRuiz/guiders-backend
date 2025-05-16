// QueryHandler para obtener usuarios por companyId
// Ubicación: src/context/auth/auth-user/application/queries/find-users-by-company-id.query-handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindUsersByCompanyIdQuery } from './find-users-by-company-id.query';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from '../../domain/user-account.repository';
import { UserAccountPrimitives } from '../../domain/user-account';
// import { UserAccountCompanyId } from '../../domain/value-objects/user-account-company-id';

@QueryHandler(FindUsersByCompanyIdQuery)
export class FindUsersByCompanyIdQueryHandler
  implements IQueryHandler<FindUsersByCompanyIdQuery, UserAccountPrimitives[]>
{
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
  ) {}

  // Maneja la consulta para obtener usuarios por companyId
  async execute(
    query: FindUsersByCompanyIdQuery,
  ): Promise<UserAccountPrimitives[]> {
    const users = await this.userRepository.findByCompanyId(query.companyId);
    return users.map((user) => user.toPrimitives());
  }
}
