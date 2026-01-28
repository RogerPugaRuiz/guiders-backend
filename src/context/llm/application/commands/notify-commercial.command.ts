/**
 * Comando para notificar a un comercial sobre una escalación
 * Enviado cuando el LLM no puede responder o el visitante solicita atención humana
 */

export class NotifyCommercialCommand {
  constructor(
    /** ID del chat donde se solicita el escalado */
    public readonly chatId: string,
    /** ID de la empresa */
    public readonly companyId: string,
    /** ID del visitante */
    public readonly visitorId: string,
    /** Mensaje generado por el LLM explicando la situación */
    public readonly message: string,
    /** Razón del escalado */
    public readonly reason?:
      | 'cannot_answer'
      | 'visitor_requested'
      | 'complex_topic'
      | 'other',
  ) {}
}
