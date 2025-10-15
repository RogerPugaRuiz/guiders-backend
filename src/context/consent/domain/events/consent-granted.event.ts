/**
 * Evento de dominio: ConsentGrantedEvent
 * Se emite cuando un visitante otorga su consentimiento
 *
 * Cumplimiento RGPD Art. 7.1: Demostrar que el interesado consintió
 */
export class ConsentGrantedEvent {
  constructor(
    public readonly payload: {
      consentId: string;
      visitorId: string;
      consentType: string;
      version: string;
      grantedAt: string;
      ipAddress: string;
      userAgent?: string;
    },
  ) {}
}
