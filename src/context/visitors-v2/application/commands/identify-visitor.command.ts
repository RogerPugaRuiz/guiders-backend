import { ICommand } from '@nestjs/cqrs';

export class IdentifyVisitorCommand implements ICommand {
  constructor(
    public readonly fingerprint: string,
    public readonly domain: string,
    public readonly apiKey: string,
    public readonly currentUrl?: string,
  ) {}
}
