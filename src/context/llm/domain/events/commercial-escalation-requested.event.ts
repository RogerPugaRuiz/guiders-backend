import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Datos de la solicitud de escalado a comercial
 */
export interface CommercialEscalationRequestedData {
  /** ID del chat donde se solicita el escalado */
  chatId: string;
  /** ID del visitante que solicita el escalado */
  visitorId: string;
  /** ID de la empresa */
  companyId: string;
  /** Mensaje generado por el LLM explicando la situación */
  message: string;
  /** Razón del escalado */
  reason?: 'cannot_answer' | 'visitor_requested' | 'complex_topic' | 'other';
  /** Fecha de la solicitud */
  requestedAt: Date;
  /** IDs de los comerciales notificados */
  notifiedCommercialIds: string[];
  /** Métodos de notificación utilizados (websocket, email) */
  notificationMethods: Array<{
    commercialId: string;
    method: 'websocket' | 'email';
    success: boolean;
  }>;
}

/**
 * Evento de dominio que se dispara cuando el LLM solicita escalado a un comercial humano
 * Este evento se usa para tracking y auditoría de las escalaciones
 */
export class CommercialEscalationRequestedEvent extends DomainEvent<{
  escalation: CommercialEscalationRequestedData;
}> {
  constructor(data: { escalation: CommercialEscalationRequestedData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'llm.commercial-escalation-requested';

  /**
   * Obtiene los datos del escalado
   */
  getEscalationData(): CommercialEscalationRequestedData {
    return this.attributes.escalation;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.escalation.chatId;
  }

  /**
   * Obtiene el ID del visitante
   */
  getVisitorId(): string {
    return this.attributes.escalation.visitorId;
  }

  /**
   * Obtiene el ID de la empresa
   */
  getCompanyId(): string {
    return this.attributes.escalation.companyId;
  }

  /**
   * Obtiene el mensaje del LLM
   */
  getMessage(): string {
    return this.attributes.escalation.message;
  }

  /**
   * Obtiene la razón del escalado
   */
  getReason(): string | undefined {
    return this.attributes.escalation.reason;
  }

  /**
   * Obtiene los IDs de los comerciales notificados
   */
  getNotifiedCommercialIds(): string[] {
    return this.attributes.escalation.notifiedCommercialIds;
  }

  /**
   * Verifica si hubo notificaciones exitosas
   */
  hasSuccessfulNotifications(): boolean {
    return this.attributes.escalation.notificationMethods.some(
      (n) => n.success,
    );
  }

  /**
   * Obtiene el número de notificaciones exitosas
   */
  getSuccessfulNotificationCount(): number {
    return this.attributes.escalation.notificationMethods.filter(
      (n) => n.success,
    ).length;
  }
}
