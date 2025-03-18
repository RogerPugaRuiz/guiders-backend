import { Inject, Injectable } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionUserId } from '../../domain/value-objects/connection-user-id';
import { ConnectionRole } from '../../domain/value-objects/connection-role';
import { ConnectionSocketId } from '../../domain/value-objects/connection-socket-id';

export interface ConnectUseCaseRequest {
  connectionId: string;
  role: 'visitor' | 'commercial';
  socketId: string;
}

@Injectable()
export class ConnectUseCase {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
  ) {}

  async execute(request: ConnectUseCaseRequest): Promise<void> {
    const { connectionId, role, socketId } = request;
    const newConnection = ConnectionUser.create({
      userId: ConnectionUserId.create(connectionId),
      role: ConnectionRole.create(role),
      socketId: ConnectionSocketId.create(socketId),
    });
    await this.repository.save(newConnection);
  }
}
