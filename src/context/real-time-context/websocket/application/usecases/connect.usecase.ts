import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import {
  ConnectionUser,
  ConnectionUserPrimitive,
} from '../../domain/connection-user';
import { ConnectionUserId } from '../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../domain/value-objects/connection-socket-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { EventPublisher } from '@nestjs/cqrs';

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
    private readonly publisher: EventPublisher,
  ) {}

  async execute(request: ConnectUseCaseRequest): Promise<void> {
    const { connectionId, role, socketId } = request;

    const criteria = new Criteria<ConnectionUserPrimitive>().addFilter(
      'userId',
      Operator.EQUALS,
      connectionId,
    );

    const result = await this.repository.findOne(criteria);

    await result.fold(
      async () => this.handleNewConnection(connectionId, role, socketId),
      async (connection) =>
        this.handleExistingConnection(connection, connectionId, socketId),
    );
  }

  private async handleNewConnection(
    connectionId: string,
    role: 'visitor' | 'commercial',
    socketId: string,
  ): Promise<void> {
    const newConnection = ConnectionUser.create({
      userId: ConnectionUserId.create(connectionId),
      role: ConnectionRole.create(role),
    });

    const newConnectionWithSocket = newConnection.connect(
      ConnectionSocketId.create(socketId),
    );
    this.logger.log(`Creating connection for userId: ${connectionId}`);
    await this.repository.save(newConnectionWithSocket);
    this.publisher.mergeObjectContext(newConnectionWithSocket).commit();
  }

  private async handleExistingConnection(
    connection: ConnectionUser,
    connectionId: string,
    socketId: string,
  ): Promise<void> {
    await connection.socketId.fold(
      async () =>
        this.connectExistingConnection(connection, connectionId, socketId),
      async () => this.logConnectionExists(connectionId),
    );
  }

  private async connectExistingConnection(
    connection: ConnectionUser,
    connectionId: string,
    socketId: string,
  ): Promise<void> {
    const newConnection = connection.connect(
      ConnectionSocketId.create(socketId),
    );
    this.logger.log(`Connecting connection for userId: ${connectionId}`);
    await this.repository.save(newConnection);
    this.publisher.mergeObjectContext(newConnection).commit();
  }

  private async logConnectionExists(connectionId: string): Promise<void> {
    this.logger.warn(`Connection already exists for userId: ${connectionId}`);
    return Promise.resolve();
  }
}
