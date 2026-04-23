export class RevokeIntegrationApiKeyCommand {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
  ) {}
}
