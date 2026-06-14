export class RefreshEmbedTokenCommand {
  constructor(
    public readonly token: string,
    public readonly expectedUserId?: string,
  ) {}
}
