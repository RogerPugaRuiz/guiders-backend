import { ConnectionUserPrimitive } from '../connection-user';

export class CommercialConnectedEvent {
  constructor(
    public readonly connection: ConnectionUserPrimitive,
    public readonly timestamp: Date = new Date(),
  ) {}
}
