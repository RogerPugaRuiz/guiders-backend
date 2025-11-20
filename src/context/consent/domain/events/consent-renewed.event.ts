/**
 * Evento de dominio: Consentimiento renovado
 * Se emite cuando un consentimiento existente es renovado
 * GDPR Art. 7.1: Renovación del consentimiento mantiene trazabilidad
 */
export class ConsentRenewedEvent {
  constructor(
    public readonly payload: {
      consentId: string;
      visitorId: string;
      consentType: string;
      newExpiresAt?: string;
      renewedAt: string;
      previousExpiresAt?: string;
    },
  ) {}
}
