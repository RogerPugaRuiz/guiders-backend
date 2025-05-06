import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { FindOneUserByIdQuery } from 'src/context/auth/auth-user/application/read/find-one-user-by-id.query';
import { Optional } from 'src/context/shared/domain/optional';
import { UserAccountPrimitives } from 'src/context/auth/auth-user/domain/user-account';
import { IUserFinder } from '../../application/read/get-username-by-id';

@Injectable()
export class UserFinderAdapterService implements IUserFinder {
  constructor(private readonly queryBus: QueryBus) {}
  async findById(id: string): Promise<string> {
    const query = new FindOneUserByIdQuery(id);
    const userOptional = await this.queryBus.execute<
      FindOneUserByIdQuery,
      Optional<{ user: UserAccountPrimitives }>
    >(query);

    if (userOptional.isEmpty()) {
      throw new Error('User not found');
    }
    return userOptional.get().user.email;
  }
}
