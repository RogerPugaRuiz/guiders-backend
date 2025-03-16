import { ConnectionSocketId } from './connection-socket-id';
import { ConnectionUser } from './connection-user';
import { ConnectionUserId } from './connection-user-id';

export const CONNECTION_REPOSITORY = Symbol('CONNECTION_REPOSITORY');

export interface ConnectionRepository {
  addConnection(user: ConnectionUser): Promise<void>;
  removeConnection(user: ConnectionUser): Promise<void>;
  findByUserId(userId: ConnectionUserId): Promise<ConnectionUser | undefined>;
  findBySocketId(
    socketId: ConnectionSocketId,
  ): Promise<ConnectionUser | undefined>;
}
