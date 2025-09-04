export class CompleteOidcAuthenticationCommand {
  constructor(
    public readonly providerName: string,
    public readonly code: string,
    public readonly state?: string,
  ) {}
}