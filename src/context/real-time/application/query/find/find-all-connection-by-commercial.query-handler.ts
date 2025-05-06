import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindAllConnectionByCommercialQuery } from './find-all-connection-by-commercial.query';
import { ConnectionUser } from '../../../domain/connection-user';
import { Inject } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';

@QueryHandler(FindAllConnectionByCommercialQuery)
export class FindAllConnectionByCommercialQueryHandler
  implements IQueryHandler<FindAllConnectionByCommercialQuery, ConnectionUser[]>
{
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
  ) {}
  async execute(): Promise<any> {
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'isConnected',
      Operator.EQUALS,
      true,
    );

    const connCommercialList = await this.connectionRepository.find(criteria);

    if (connCommercialList.length === 0) {
      throw new Error('No commercial connections found');
    }

    return connCommercialList.filter((conn) =>
      conn.hasRole(ConnectionRole.COMMERCIAL),
    );
  }
}
