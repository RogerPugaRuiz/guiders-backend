export class ConnectedEvent {
  constructor(
    public readonly connectionId: string,
    public readonly roles: string[],
    public readonly timestamp: Date = new Date(),
  ) {}
}
