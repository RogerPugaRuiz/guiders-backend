import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionUserId } from '../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../domain/value-objects/connection-socket-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';

export interface ConnectUseCaseRequest {
  connectionId: string;
  role: 'visitor' | 'commercial';
  socketId: string;
}

@Injectable()
export class ConnectUseCase {
  private logger = new Logger(ConnectUseCase.name);
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
  ) {}

  async execute(request: ConnectUseCaseRequest): Promise<void> {
    const { connectionId, role, socketId } = request;
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      connectionId,
    );
    const result = await this.repository.findOne(criteria);
    await result.fold(
      // En caso de error, podemos registrar el fallo o simplemente no hacer nada.
      async () => {
        const newConnection = ConnectionUser.create({
          userId: ConnectionUserId.create(connectionId),
          socketId: ConnectionSocketId.create(socketId),
          role: ConnectionRole.create(role),
        });
        this.logger.log(`Creating connection for userId: ${connectionId}`);
        await this.repository.save(newConnection);
      },
      // En caso de éxito, conectamos y guardamos la nueva conexión.
      async (connection) => {
        await connection.socketId.fold(
          async () => {
            const newConnection = connection.connect(
              ConnectionSocketId.create(socketId),
            );
            this.logger.log(
              `Connecting connection for userId: ${connectionId}`,
            );
            await this.repository.save(newConnection);
          },
          async () => {
            this.logger.warn(
              `Connection already exists for userId: ${connectionId}`,
            );
            return Promise.resolve();
          },
        );
      },
    );
  }
}
