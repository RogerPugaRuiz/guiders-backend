import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Datos de la solicitud de agente
 */
export interface AgentRequestedData {
  chatId: string;
  visitorId: string;
  previousPriority: string;
  newPriority: string;
  source: string;
  requestedAt: Date;
}

/**
 * Evento de dominio que se dispara cuando un visitante solicita atención de un agente humano
 * Este evento cambia la prioridad del chat a URGENT y notifica a los comerciales disponibles
 */
export class AgentRequestedEvent extends DomainEvent<{
  request: AgentRequestedData;
}> {
  constructor(data: { request: AgentRequestedData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'chat.v2.agent-requested';

  /**
   * Obtiene los datos de la solicitud
   */
  getRequestData(): AgentRequestedData {
    return this.attributes.request;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.request.chatId;
  }

  /**
   * Obtiene el ID del visitante
   */
  getVisitorId(): string {
    return this.attributes.request.visitorId;
  }

  /**
   * Obtiene la prioridad anterior
   */
  getPreviousPriority(): string {
    return this.attributes.request.previousPriority;
  }

  /**
   * Obtiene la nueva prioridad
   */
  getNewPriority(): string {
    return this.attributes.request.newPriority;
  }

  /**
   * Obtiene el origen de la solicitud
   */
  getSource(): string {
    return this.attributes.request.source;
  }

  /**
   * Verifica si la solicitud proviene de quick actions
   */
  isFromQuickAction(): boolean {
    return this.attributes.request.source === 'quick_action';
  }

  /**
   * Verifica si hubo cambio de prioridad
   */
  hadPriorityChange(): boolean {
    return (
      this.attributes.request.previousPriority !==
      this.attributes.request.newPriority
    );
  }
}
