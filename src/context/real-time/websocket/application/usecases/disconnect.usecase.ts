import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../domain/connection-user';
import { EventPublisher } from '@nestjs/cqrs';
import { ConnectionRoleEnum } from '../../domain/value-objects/connection-role';

export interface DisconnectUseCaseRequest {
  socketId: string;
}

@Injectable()
export class DisconnectUseCase {
  private logger = new Logger(DisconnectUseCase.name);
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(request: DisconnectUseCaseRequest): Promise<void> {
    const { socketId } = request;
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'socketId',
      Operator.EQUALS,
      socketId,
    );
    const result = await this.repository.findOne(criteria);
    await result.fold(
      async () => {
        // En caso de error, podemos registrar el fallo o simplemente no hacer nada.
        this.logger.warn(`Connection not found for socketId: ${socketId}`);
        const criteria = new Criteria<ConnectionUser>().addFilter(
          'roles',
          Operator.EQUALS,
          ConnectionRoleEnum.VISITOR,
        );
        const findAllConnections = await this.repository.find(criteria);
        this.logger.warn(
          `All connections: ${findAllConnections
            .map((connection) => connection.userId.value)
            .join(', ')}`,
        );
        return Promise.resolve();
      },
      async (connection) => {
        const disconnectedConnection = connection.disconnect();
        this.logger.log(
          `Disconnecting connection for userId: ${connection.userId.value}`,
        );
        await this.repository.save(disconnectedConnection);
        this.publisher.mergeObjectContext(disconnectedConnection).commit();
      },
    );
  }
}
