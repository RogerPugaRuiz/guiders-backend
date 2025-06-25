import {
  CommandHandler,
  EventPublisher,
  ICommandHandler,
  EventBus,
} from '@nestjs/cqrs';
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
import { ConnectionCompanyId } from '../../../domain/value-objects/connection-company-id';
import { INotification, NOTIFICATION } from '../../../domain/notification';
import { CommercialConnectedEvent } from '../../../domain/events/commercial-connected.event';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from 'src/context/auth/auth-user/domain/user-account.repository';

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
    private readonly eventBus: EventBus,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userAccountRepository: UserAccountRepository,
  ) {}
  async execute(command: ConnectUserCommand): Promise<void> {
    const { userId, socketId, roles, companyId } = command;

    // Si no se proporciona companyId, lo obtenemos del UserAccount
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const userAccount = await this.userAccountRepository.findById(userId);
      if (!userAccount) {
        this.logger.error(`User account not found for userId: ${userId}`);
        throw new Error(`User account not found for userId: ${userId}`);
      }
      resolvedCompanyId = userAccount.companyId.getValue();
    }

    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      userId,
    );

    const result = await this.repository.findOne(criteria);

    await result.fold(
      () =>
        this.handleNewConnection(userId, roles, socketId, resolvedCompanyId),
      async (connection) =>
        await this.handleExistingConnection(connection, socketId),
    );

    await this.notification.notifyRole({
      role: 'commercial',
      type: 'visitor:connected',
      payload: {
        socketId,
        roles,
      },
    });

    // Si el usuario conectado es un comercial, disparamos el evento CommercialConnectedEvent
    if (roles.includes(ConnectionRole.COMMERCIAL)) {
      // Obtenemos la conexión actualizada para asegurarnos de tener la última versión
      const updatedResult = await this.repository.findOne(criteria);
      updatedResult.fold(
        () => {
          this.logger.warn(
            `No se pudo encontrar la conexión para el usuario ${userId} después de conectarlo`,
          );
        },
        (connection) => {
          // Publicamos el evento de comercial conectado
          this.eventBus.publish(
            new CommercialConnectedEvent(connection.toPrimitives()),
          );
          this.logger.log(
            `Comercial ${userId} conectado - Evento CommercialConnectedEvent disparado`,
          );
        },
      );
    }
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
    companyId: string,
  ): Promise<void> {
    const newConnection = ConnectionUser.create({
      userId: ConnectionUserId.create(userId),
      roles: roles.map((role) => ConnectionRole.create(role)),
      companyId: ConnectionCompanyId.create(companyId),
    });
    const newConnectionWithSocket = newConnection.connect(
      ConnectionSocketId.create(socketId),
    );
    await this.repository.save(newConnectionWithSocket);
    this.publisher.mergeObjectContext(newConnectionWithSocket).commit();

    this.logger.log(`User ${userId} connected`);
  }
}
