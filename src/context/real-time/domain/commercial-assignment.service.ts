import { Inject, Injectable } from '@nestjs/common';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { RepositoryError } from 'src/context/shared/domain/errors/repository.error';
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
    try {
      // Usar el operador EQUALS para verificar si el usuario tiene el rol 'commercial'
      // Esto funciona porque el repositorio maneja internamente la verificación de roles en array
      const criteria = new Criteria<ConnectionUser>().addFilter(
        'roles',
        Operator.IN,
        [ConnectionRole.COMMERCIAL],
      );
      const connCommercialList = await this.connectionRepository.find(criteria);

      if (!connCommercialList || connCommercialList.length === 0) {
        return [];
      }

      // Filtramos solo aquellos comerciales que están activamente conectados
      const connectedCommercials = connCommercialList.filter(
        (conn: ConnectionUser) => conn.isConnected(),
      );

      return connectedCommercials;
    } catch (error) {
      console.error('Error fetching connected commercials:', error);
      throw new RepositoryError(
        'Failed to retrieve connected commercials',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
