/**
 * Command para revocar un consentimiento
 * RGPD Art. 7.3: Derecho a retirar el consentimiento
 */
export class RevokeConsentCommand {
  constructor(
    public readonly visitorId: string,
    public readonly consentType: string,
    public readonly reason?: string,
  ) {}
}
