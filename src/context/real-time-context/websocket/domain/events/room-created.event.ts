export class RoomCreatedEvent {
  constructor(
    public readonly roomId: string,
    public readonly userId: string,
    public readonly role: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
