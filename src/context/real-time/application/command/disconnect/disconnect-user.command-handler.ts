import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { DisconnectUserCommand } from './disconnect-user.command';
import { Inject, Logger } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../../domain/connection-user';
import { INotification, NOTIFICATION } from '../../../domain/notification';

@CommandHandler(DisconnectUserCommand)
export class DisconnectUserCommandHandler
  implements ICommandHandler<DisconnectUserCommand, void>
{
  private readonly logger = new Logger(DisconnectUserCommandHandler.name);
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
    private readonly publisher: EventPublisher,
    @Inject(NOTIFICATION)
    private readonly notification: INotification,
  ) {}
  async execute(command: DisconnectUserCommand): Promise<void> {
    const { userId } = command;
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      userId,
    );

    const foundConnection = await this.connectionRepository.findOne(criteria);
    await foundConnection.fold(
      async () => {
        this.logger.error('Connection not found');
        return Promise.resolve();
      },
      async (connection) => await this.handleExistingConnection(connection),
    );

    await this.notification.notify({
      recipientId: userId,
      type: 'visitor:disconnected',
      payload: {
        userId,
      },
    });
  }

  private async handleExistingConnection(
    connection: ConnectionUser,
  ): Promise<void> {
    const disconnectedConnection = connection.disconnect();
    await this.connectionRepository.save(disconnectedConnection);
    this.publisher.mergeObjectContext(disconnectedConnection).commit();

    this.logger.log(`User ${disconnectedConnection.userId.value} disconnected`);
  }
}
