import { ConnectionUserPrimitive } from '../connection-user';

export class CommercialDisconnectedEvent {
  constructor(
    public readonly connection: ConnectionUserPrimitive,
    public readonly timestamp: Date = new Date(),
  ) {}
}
