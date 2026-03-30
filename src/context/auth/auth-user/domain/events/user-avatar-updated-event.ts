export class UserAvatarUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly keycloakId: string | null,
    public readonly avatarUrl: string | null,
    public readonly previousAvatarUrl: string | null,
  ) {}
}
