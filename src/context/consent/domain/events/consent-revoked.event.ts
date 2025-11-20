/**
 * Evento de dominio: ConsentRevokedEvent
 * Se emite cuando un visitante revoca su consentimiento
 *
 * Cumplimiento RGPD Art. 7.3: Derecho a retirar el consentimiento
 */
export class ConsentRevokedEvent {
  constructor(
    public readonly payload: {
      consentId: string;
      visitorId: string;
      consentType: string;
      revokedAt: string;
      reason?: string;
    },
  ) {}
}
