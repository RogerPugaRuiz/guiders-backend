export class CreateOidcProviderCommand {
  constructor(
    public readonly name: string,
    public readonly clientId: string,
    public readonly clientSecret: string,
    public readonly issuerUrl: string,
    public readonly scopes: string[],
  ) {}
}