export class LinkUserWithKeycloakCommand {
  constructor(
    public readonly userId: string,
    public readonly keycloakId: string,
  ) {}
}
