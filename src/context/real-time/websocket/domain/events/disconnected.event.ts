import { ConnectionUserPrimitive } from '../connection-user';

export class DisconnectedEvent {
  constructor(
    public readonly connection: ConnectionUserPrimitive,
    public readonly timestamp: Date = new Date(),
  ) {}
}
