export class CreateEmbedTokenCommand {
  constructor(
    public readonly userId: string,
    public readonly companyId: string,
  ) {}
}
