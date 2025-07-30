import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Datos del chat cerrado
 */
export interface ChatClosedData {
  chatId: string;
  visitorId: string;
  commercialId?: string;
  closedBy: string;
  reason: string;
  previousStatus: string;
  closedAt: Date;
  duration: number; // duración en segundos
  totalMessages: number;
  firstResponseTime?: number; // tiempo de primera respuesta en segundos
}

/**
 * Evento de dominio que se dispara cuando se cierra un chat
 */
export class ChatClosedEvent extends DomainEvent<{
  closure: ChatClosedData;
}> {
  constructor(data: { closure: ChatClosedData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'chat.v2.closed';

  /**
   * Obtiene los datos del cierre
   */
  getClosureData(): ChatClosedData {
    return this.attributes.closure;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.closure.chatId;
  }

  /**
   * Obtiene el ID del visitante
   */
  getVisitorId(): string {
    return this.attributes.closure.visitorId;
  }

  /**
   * Obtiene el ID del comercial si existe
   */
  getCommercialId(): string | undefined {
    return this.attributes.closure.commercialId;
  }

  /**
   * Obtiene la razón del cierre
   */
  getReason(): string {
    return this.attributes.closure.reason;
  }

  /**
   * Obtiene la duración del chat en segundos
   */
  getDuration(): number {
    return this.attributes.closure.duration;
  }

  /**
   * Verifica si fue cerrado por el visitante
   */
  wasClosedByVisitor(): boolean {
    return (
      this.attributes.closure.closedBy === this.attributes.closure.visitorId
    );
  }

  /**
   * Verifica si fue cerrado por el comercial
   */
  wasClosedByCommercial(): boolean {
    return Boolean(
      this.attributes.closure.commercialId &&
        this.attributes.closure.closedBy ===
          this.attributes.closure.commercialId,
    );
  }

  /**
   * Verifica si tuvo primera respuesta
   */
  hadFirstResponse(): boolean {
    return Boolean(this.attributes.closure.firstResponseTime);
  }
}
