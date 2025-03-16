import { Injectable } from '@nestjs/common';
import { ConnectionRepository } from '../domain/connection.repository';
import { ConnectionSocketId } from '../domain/connection-socket-id';
import { ConnectionUser } from '../domain/connection-user';
import { ConnectionUserId } from '../domain/connection-user-id';

@Injectable()
export class InMemoryConnectionService implements ConnectionRepository {
  private userSocketsMap: Map<string, string> = new Map(); // userId -> socketId
  private socketUserMap: Map<string, string> = new Map(); // socketId -> userId

  addConnection(user: ConnectionUser): Promise<void> {
    const { userId, socketId } = user.toPrimitives();
    this.userSocketsMap.set(userId, socketId);
    this.socketUserMap.set(socketId, userId);
    return Promise.resolve();
  }

  removeConnection(user: ConnectionUser): Promise<void> {
    const { userId } = user.toPrimitives();
    const socketId = this.userSocketsMap.get(userId);
    if (socketId) {
      this.userSocketsMap.delete(userId);
      this.socketUserMap.delete(socketId);
    }
    return Promise.resolve();
  }

  findBySocketId(
    socketId: ConnectionSocketId,
  ): Promise<ConnectionUser | undefined> {
    const userId = this.socketUserMap.get(socketId.value);
    if (userId) {
      return Promise.resolve(
        ConnectionUser.fromPrimitives({ userId, socketId: socketId.value }),
      );
    }
    return Promise.resolve(undefined);
  }

  findByUserId(userId: ConnectionUserId): Promise<ConnectionUser | undefined> {
    const socketId = this.userSocketsMap.get(userId.value);
    if (socketId) {
      return Promise.resolve(
        ConnectionUser.fromPrimitives({ userId: userId.value, socketId }),
      );
    }
    return Promise.resolve(undefined);
  }
}
