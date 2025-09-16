import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOneUserByIdQuery } from './find-one-user-by-id.query';
import { Optional } from 'src/context/shared/domain/optional';
import { UserAccountPrimitives } from '../../domain/user-account.aggregate';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from '../../domain/user-account.repository';
import { Inject } from '@nestjs/common';

@QueryHandler(FindOneUserByIdQuery)
export class FindOneUserByIdQueryHandler
  implements
    IQueryHandler<
      FindOneUserByIdQuery,
      Optional<{ user: UserAccountPrimitives }>
    >
{
  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
  ) {}

  async execute(
    query: FindOneUserByIdQuery,
  ): Promise<Optional<{ user: UserAccountPrimitives }>> {
    const { userId } = query;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      return Optional.empty();
    }

    return Optional.of({
      user: user.toPrimitives(),
    });
  }
}
