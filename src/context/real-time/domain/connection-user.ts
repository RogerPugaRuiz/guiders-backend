import { Optional } from 'src/context/shared/domain/optional';
import { ConnectionRole } from './value-objects/connection-role';
import { ConnectionSocketId } from './value-objects/connection-socket-id';
import { ConnectionUserId } from './value-objects/connection-user-id';
import { ConnectionCompanyId } from './value-objects/connection-company-id';
import { AggregateRoot } from '@nestjs/cqrs';
import { ConnectedEvent } from './events/connected.event';
import { DisconnectedEvent } from './events/disconnected.event';
import { RealTimeMessageSendEvent } from './events/real-time-message-send.event';

export interface ConnectionUserPrimitive {
  userId: string;
  socketId: string | null;
  roles: string[];
  companyId?: string;
}

export class ConnectionUser extends AggregateRoot {
  private constructor(
    readonly userId: ConnectionUserId,
    readonly socketId: Optional<ConnectionSocketId>,
    readonly roles: ConnectionRole[],
    readonly companyId: ConnectionCompanyId,
  ) {
    super();
  }

  public static create(params: {
    userId: ConnectionUserId;
    roles: ConnectionRole[];
    companyId: ConnectionCompanyId;
  }): ConnectionUser {
    return new ConnectionUser(
      params.userId,
      Optional.empty(),
      params.roles,
      params.companyId,
    );
  }

  public static fromPrimitives(primitives: {
    userId: string;
    socketId?: string;
    roles: string[];
    companyId?: string;
  }): ConnectionUser {
    return new ConnectionUser(
      ConnectionUserId.create(primitives.userId),
      primitives.socketId
        ? Optional.of<ConnectionSocketId>(
            ConnectionSocketId.create(primitives.socketId),
          )
        : Optional.empty(),
      primitives.roles.map((role) => ConnectionRole.create(role)),
      ConnectionCompanyId.create(
        primitives.companyId || '550e8400-e29b-41d4-a716-446655440000',
      ),
    );
  }

  public isSameUser(userId: ConnectionUserId): boolean {
    return this.userId.equals(userId);
  }

  public isConnected(): boolean {
    return this.socketId.isPresent();
  }

  public hasRole(role: string | ConnectionRole): boolean {
    if (typeof role === 'string') {
      return this.roles.some((r) => r.value === role);
    }
    return this.roles.some((r) => r.equals(role));
  }

  public ifConnected(callback: (connection: ConnectionUser) => void): void {
    if (this.isConnected()) {
      callback(this);
    }
  }

  public isDisconnected(): boolean {
    return !this.isConnected();
  }

  public ifDisconnected(callback: (connection: ConnectionUser) => void): void {
    if (this.isDisconnected()) {
      callback(this);
    }
  }

  public toPrimitives(): ConnectionUserPrimitive {
    return {
      userId: this.userId.value,
      socketId: this.socketId.map((socketId) => socketId.value).getOrNull(),
      roles: this.roles.map((role) => role.value),
      companyId: this.companyId.value,
    };
  }

  public updateRole(roles: ConnectionRole[]): ConnectionUser {
    return new ConnectionUser(
      this.userId,
      this.socketId,
      roles,
      this.companyId,
    );
  }

  public connect(socketId: ConnectionSocketId): ConnectionUser {
    const newConnection = new ConnectionUser(
      this.userId,
      Optional.of(socketId),
      this.roles,
      this.companyId,
    );
    newConnection.apply(new ConnectedEvent(newConnection.toPrimitives()));
    return newConnection;
  }

  public disconnect(): ConnectionUser {
    const newDisconnect = new ConnectionUser(
      this.userId,
      Optional.empty(),
      this.roles,
      this.companyId,
    );

    newDisconnect.apply(new DisconnectedEvent(newDisconnect.toPrimitives()));

    return newDisconnect;
  }

  public sendMessage(params: {
    toUser?: ConnectionUser;
    message: string;
    timestamp: Date;
  }): ConnectionUser {
    console.log(
      'hasRoleCommercial',
      params.toUser ? params.toUser.hasRole('commercial') : true,
    );
    console.log(
      'hasRoleVisitor',
      params.toUser ? params.toUser.hasRole('visitor') : false,
    );
    console.log('hasRoleVisitor', this.hasRole('visitor'));
    this.apply(
      new RealTimeMessageSendEvent(
        this.userId.value,
        params.toUser ? params.toUser.userId.value : 'all',
        params.message,
        params.timestamp,
        params.toUser
          ? params.toUser.hasRole('commercial')
            ? 'toCommercial'
            : 'toVisitor'
          : 'toCommercial',
      ),
    );
    return this;
  }
}
