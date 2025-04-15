import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { ConnectUserCommand } from './connect-user.command';
import { Inject, Logger } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../../domain/connection-user';
import { ConnectionSocketId } from '../../../domain/value-objects/connection-socket-id';
import { ConnectionUserId } from '../../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../../domain/value-objects/connection-role';
import { INotification, NOTIFICATION } from '../../../domain/notification';

@CommandHandler(ConnectUserCommand)
export class ConnectUserCommandHandler
  implements ICommandHandler<ConnectUserCommand, void>
{
  private readonly logger = new Logger(ConnectUserCommandHandler.name);
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
    @Inject(NOTIFICATION)
    private readonly notification: INotification,
    private readonly publisher: EventPublisher,
  ) {}
  async execute(command: ConnectUserCommand): Promise<void> {
    const { userId, socketId, roles } = command;

    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      userId,
    );

    const result = await this.repository.findOne(criteria);

    await result.fold(
      () => this.handleNewConnection(userId, roles, socketId),
      async (connection) =>
        await this.handleExistingConnection(connection, socketId),
    );

    await this.notification.notify({
      recipientId: userId,
      type: 'visitor:connected',
      payload: {
        socketId,
        roles,
      },
    });
  }

  private async handleExistingConnection(
    connection: ConnectionUser,
    socketId: string,
  ): Promise<void> {
    const connectionWithSocket = connection.connect(
      ConnectionSocketId.create(socketId),
    );
    await this.repository.save(connectionWithSocket);
    this.publisher.mergeObjectContext(connectionWithSocket).commit();

    this.logger.log(
      `User ${connection.userId.value} reconnected with socket ${socketId}`,
    );
  }

  private async handleNewConnection(
    userId: string,
    roles: string[],
    socketId: string,
  ): Promise<void> {
    const newConnection = ConnectionUser.create({
      userId: ConnectionUserId.create(userId),
      roles: roles.map((role) => ConnectionRole.create(role)),
    });
    const newConnectionWithSocket = newConnection.connect(
      ConnectionSocketId.create(socketId),
    );
    await this.repository.save(newConnectionWithSocket);
    this.publisher.mergeObjectContext(newConnectionWithSocket).commit();

    this.logger.log(`User ${userId} connected`);
  }
}
