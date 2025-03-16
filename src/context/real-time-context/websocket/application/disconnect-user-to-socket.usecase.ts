import { Inject, Injectable } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../domain/connection.repository';
import { ConnectionSocketId } from '../domain/connection-socket-id';

@Injectable()
export class DisconnectUserToSocketUseCase {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
  ) {}

  async execute(socketId: string): Promise<void> {
    const user = await this.repository.findBySocketId(
      ConnectionSocketId.create(socketId),
    );
    if (user) {
      await this.repository.removeConnection(user);
    }
  }
}
