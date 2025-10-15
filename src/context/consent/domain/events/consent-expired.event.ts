/**
 * Evento de dominio: ConsentExpiredEvent
 * Se emite cuando un consentimiento alcanza su fecha de expiración
 *
 * Permite auditar y rastrear consentimientos vencidos
 */
export class ConsentExpiredEvent {
  constructor(
    public readonly payload: {
      consentId: string;
      visitorId: string;
      consentType: string;
      expiredAt: string;
    },
  ) {}
}
