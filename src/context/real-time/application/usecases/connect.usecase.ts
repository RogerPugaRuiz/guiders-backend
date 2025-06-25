import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionUserId } from '../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../domain/value-objects/connection-socket-id';
import { ConnectionCompanyId } from '../../domain/value-objects/connection-company-id';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { EventPublisher } from '@nestjs/cqrs';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from 'src/context/auth/auth-user/domain/user-account.repository';

export interface ConnectUseCaseRequest {
  connectionId: string;
  roles: string[];
  socketId: string;
  companyId?: string;
}

@Injectable()
export class ConnectUseCase {
  private logger = new Logger(ConnectUseCase.name);
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
    private readonly publisher: EventPublisher,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userAccountRepository: UserAccountRepository,
  ) {}

  async execute(request: ConnectUseCaseRequest): Promise<void> {
    const { connectionId, roles, socketId, companyId } = request;

    // Si no se proporciona companyId, lo obtenemos del UserAccount
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const userAccount =
        await this.userAccountRepository.findById(connectionId);
      if (!userAccount) {
        this.logger.error(`User account not found for userId: ${connectionId}`);
        throw new Error(`User account not found for userId: ${connectionId}`);
      }
      resolvedCompanyId = userAccount.companyId.getValue();
    }

    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      connectionId,
    );

    const result = await this.repository.findOne(criteria);

    await result.fold(
      async () =>
        this.handleNewConnection(
          connectionId,
          roles,
          socketId,
          resolvedCompanyId,
        ),
      async (connection) =>
        this.handleExistingConnection(connection, connectionId, socketId),
    );
  }

  private async handleNewConnection(
    connectionId: string,
    roles: string[],
    socketId: string,
    companyId: string,
  ): Promise<void> {
    const newConnection = ConnectionUser.create({
      userId: ConnectionUserId.create(connectionId),
      roles: roles.map((role) => ConnectionRole.create(role)),
      companyId: ConnectionCompanyId.create(companyId),
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
