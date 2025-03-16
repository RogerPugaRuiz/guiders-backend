import { ConnectionSocketId } from './connection-socket-id';
import { ConnectionUserId } from './connection-user-id';

export class ConnectionUser {
  private constructor(
    readonly userId: ConnectionUserId,
    readonly socketId: ConnectionSocketId,
  ) {}

  public static create(params: {
    userId: ConnectionUserId;
    socketId: ConnectionSocketId;
  }): ConnectionUser {
    return new ConnectionUser(params.userId, params.socketId);
  }

  public static fromPrimitives(primitives: {
    userId: string;
    socketId: string;
  }): ConnectionUser {
    return new ConnectionUser(
      ConnectionUserId.create(primitives.userId),
      ConnectionSocketId.create(primitives.socketId),
    );
  }

  public toPrimitives() {
    return {
      userId: this.userId.value,
      socketId: this.socketId.value,
    };
  }
}
