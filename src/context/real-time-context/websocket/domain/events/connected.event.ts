import { ConnectionUserPrimitive } from '../connection-user';

export class ConnectedEvent {
  constructor(
    public readonly connection: ConnectionUserPrimitive,
    public readonly timestamp: Date = new Date(),
  ) {}
}
