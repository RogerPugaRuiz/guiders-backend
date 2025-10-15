/**
 * Evento de dominio: Consentimiento rechazado
 * Se emite cuando un visitante rechaza explícitamente el consentimiento
 * RGPD Art. 5.2: Responsabilidad proactiva - demostrar cumplimiento
 */
export class ConsentDeniedEvent {
  constructor(
    public readonly payload: {
      consentId: string;
      visitorId: string;
      consentType: string;
      version: string;
      deniedAt: string;
      ipAddress: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
  ) {}
}
