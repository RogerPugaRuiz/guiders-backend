/**
 * Query para obtener el historial completo de consentimientos de un visitante
 * Permite cumplir con RGPD Art. 15: Derecho de acceso del interesado
 */
export class GetVisitorConsentHistoryQuery {
  constructor(public readonly visitorId: string) {}
}
