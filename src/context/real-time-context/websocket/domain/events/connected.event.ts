export class ConnectedEvent {
  constructor(
    public readonly connectionId: string,
    public readonly role: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
