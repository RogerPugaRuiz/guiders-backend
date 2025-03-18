import { Optional } from 'src/context/shared/domain/optional';
import { ConnectionRole } from './value-objects/connection-role';
import { ConnectionSocketId } from './value-objects/connection-socket-id';
import { ConnectionUserId } from './value-objects/connection-user-id';
import { AggregateRoot } from '@nestjs/cqrs';

export interface ConnectionUserPrimitive {
  userId: string;
  socketId: string | null;
  role: string;
}

export class ConnectionUser extends AggregateRoot {
  private constructor(
    readonly userId: ConnectionUserId,
    readonly socketId: Optional<ConnectionSocketId>,
    readonly role: ConnectionRole,
  ) {
    super();
  }

  public static create(params: {
    userId: ConnectionUserId;
    socketId: ConnectionSocketId;
    role: ConnectionRole;
  }): ConnectionUser {
    return new ConnectionUser(
      params.userId,
      Optional.of(params.socketId),
      params.role,
    );
  }

  public static fromPrimitives(primitives: {
    userId: string;
    socketId?: string;
    role: string;
  }): ConnectionUser {
    return new ConnectionUser(
      ConnectionUserId.create(primitives.userId),
      Optional.ofNullable(primitives.socketId).map((socketId) =>
        ConnectionSocketId.create(socketId),
      ),
      ConnectionRole.create(primitives.role),
    );
  }

  public isSameUser(userId: ConnectionUserId): boolean {
    return this.userId.equals(userId);
  }

  public isConnected(): boolean {
    return this.socketId.isPresent();
  }

  public ifConnected(callback: (socketId: ConnectionSocketId) => void): void {
    this.socketId.ifPresent(callback);
  }

  public isDisconnected(): boolean {
    return !this.isConnected();
  }

  public ifDisconnected(callback: () => void): void {
    if (this.isDisconnected()) {
      callback();
    }
  }

  public toPrimitives(): ConnectionUserPrimitive {
    return {
      userId: this.userId.value,
      socketId: this.socketId.map((socketId) => socketId.value).getOrNull(),
      role: this.role.value,
    };
  }

  public updateRole(role: ConnectionRole): ConnectionUser {
    return new ConnectionUser(this.userId, this.socketId, role);
  }

  public connect(socketId: ConnectionSocketId): ConnectionUser {
    return new ConnectionUser(this.userId, Optional.of(socketId), this.role);
  }

  public disconnect(): ConnectionUser {
    return new ConnectionUser(this.userId, Optional.empty(), this.role);
  }
}
