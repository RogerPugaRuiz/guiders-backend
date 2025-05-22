import { Inject, Injectable } from '@nestjs/common';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from './connection-user';
import { ConnectionRole } from './value-objects/connection-role';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from './connection.repository';

@Injectable()
export class CommercialAssignmentService {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
  ) {}

  /**
   * Obtiene la lista de comerciales conectados
   * @returns Lista de conexiones de comerciales activos
   */
  async getConnectedCommercials(): Promise<ConnectionUser[]> {
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'roles',
      Operator.IN,
      [ConnectionRole.COMMERCIAL],
    );

    const connCommercialList = await this.connectionRepository.find(criteria);

    if (connCommercialList.length === 0) {
      return [];
    }

    // Filtramos solo aquellos comerciales que están activamente conectados
    const connectedCommercials = connCommercialList.filter(
      (conn: ConnectionUser) => conn.isConnected(),
    );

    return connectedCommercials;
  }
}
