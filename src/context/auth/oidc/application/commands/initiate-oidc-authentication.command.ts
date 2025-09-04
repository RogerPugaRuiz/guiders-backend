export class InitiateOidcAuthenticationCommand {
  constructor(
    public readonly providerName: string,
    public readonly redirectUrl?: string,
  ) {}
}