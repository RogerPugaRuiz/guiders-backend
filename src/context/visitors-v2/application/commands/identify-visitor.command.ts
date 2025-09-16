import { ICommand } from '@nestjs/cqrs';

export class IdentifyVisitorCommand implements ICommand {
  constructor(
    public readonly fingerprint: string,
    public readonly siteId: string,
    public readonly tenantId: string,
    public readonly currentUrl?: string,
  ) {}
}
