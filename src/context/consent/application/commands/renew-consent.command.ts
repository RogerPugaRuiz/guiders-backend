/**
 * Command para renovar un consentimiento
 * GDPR Art. 7.1: Mantener registro actualizado del consentimiento
 */
export class RenewConsentCommand {
  constructor(
    public readonly visitorId: string,
    public readonly consentType: string,
    public readonly newExpiresAt: Date,
  ) {}
}
