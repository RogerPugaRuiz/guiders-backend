import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindOneUserBySocketIdQuery } from './find-one-user-by-socket-id.query';
import {
  ConnectionUser,
  ConnectionUserPrimitive,
} from '../../../domain/connection-user';
import { Inject } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

export interface FindOneUserBySocketIdQueryResult {
  user?: ConnectionUserPrimitive;
}

@QueryHandler(FindOneUserBySocketIdQuery)
export class FindOneUserBySocketIdQueryHandler
  implements
    IQueryHandler<FindOneUserBySocketIdQuery, FindOneUserBySocketIdQueryResult>
{
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
  ) {}
  async execute(
    query: FindOneUserBySocketIdQuery,
  ): Promise<FindOneUserBySocketIdQueryResult> {
    const { socketId } = query;

    const criteria = new Criteria<ConnectionUser>().addFilter(
      'socketId',
      Operator.EQUALS,
      socketId,
    );

    const result = await this.connectionRepository.findOne(criteria);

    return result.fold(
      () => ({}),
      (connection) => ({ user: connection.toPrimitives() }),
    );
  }
}
