export class CreateIntegrationApiKeyCommand {
  constructor(
    public readonly companyId: string,
    public readonly name: string,
    public readonly environment: 'live' | 'test',
  ) {}
}
