import { Inject } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../domain/connection.repository';
import { ConnectionUser } from '../domain/connection-user';
import { ConnectionSocketId } from '../domain/connection-socket-id';
import { ConnectionUserId } from '../domain/connection-user-id';

export interface ConnectionUserRequest {
  userId: string;
  socketId: string;
}

export class ConnectUserToSocketUseCase {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
  ) {}

  public async execute(request: ConnectionUserRequest): Promise<void> {
    const { userId, socketId } = request;

    if (!userId || !socketId) {
      throw new Error('Invalid request');
    }

    const user = await this.repository.findByUserId(
      ConnectionUserId.create(userId),
    );

    if (user) {
      await this.repository.removeConnection(user);
    }

    const newUser = ConnectionUser.create({
      userId: ConnectionUserId.create(userId),
      socketId: ConnectionSocketId.create(socketId),
    });
    await this.repository.addConnection(newUser);
  }
}
