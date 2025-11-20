export class SyncUserWithKeycloakCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly keycloakId: string,
    public readonly roles: string[],
    public readonly companyId: string,
  ) {}
}
