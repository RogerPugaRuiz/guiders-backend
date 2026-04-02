export type DatabaseType = 'postgres' | 'mongodb';

export type DatabaseStatusValue = 'connected' | 'degraded' | 'disconnected';

export class DatabaseStatus {
  private constructor(
    private readonly _type: DatabaseType,
    private readonly _status: DatabaseStatusValue,
    private readonly _latencyMs: number | null,
  ) {}

  static connected(type: DatabaseType, latencyMs: number): DatabaseStatus {
    return new DatabaseStatus(type, 'connected', latencyMs);
  }

  static degraded(type: DatabaseType, latencyMs: number): DatabaseStatus {
    return new DatabaseStatus(type, 'degraded', latencyMs);
  }

  static disconnected(type: DatabaseType): DatabaseStatus {
    return new DatabaseStatus(type, 'disconnected', null);
  }

  get type(): DatabaseType {
    return this._type;
  }

  get status(): DatabaseStatusValue {
    return this._status;
  }

  get latencyMs(): number | null {
    return this._latencyMs;
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }

  isDegraded(): boolean {
    return this._status === 'degraded';
  }

  isDisconnected(): boolean {
    return this._status === 'disconnected';
  }

  toPrimitives(): {
    type: DatabaseType;
    status: DatabaseStatusValue;
    latencyMs: number | null;
  } {
    return {
      type: this._type,
      status: this._status,
      latencyMs: this._latencyMs,
    };
  }
}
