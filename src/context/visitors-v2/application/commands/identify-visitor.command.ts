import { ICommand } from '@nestjs/cqrs';

export class IdentifyVisitorCommand implements ICommand {
  constructor(
    public readonly fingerprint: string,
    public readonly domain: string,
    public readonly apiKey: string,
    public readonly hasAcceptedPrivacyPolicy: boolean,
    public readonly ipAddress: string,
    public readonly userAgent: string | undefined,
    public readonly cookieHeader: string | undefined,
    public readonly currentUrl?: string,
    public readonly consentVersion?: string,
  ) {}
}
