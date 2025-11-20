export class UserAvatarUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly avatarUrl: string | null,
    public readonly previousAvatarUrl: string | null,
  ) {}
}
