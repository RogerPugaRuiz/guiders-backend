import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Datos del evento de apertura de vista del chat
 */
export interface ChatViewOpenedData {
  chatId: string;
  userId: string;
  userRole: 'visitor' | 'commercial';
  openedAt: Date;
}

/**
 * Evento de dominio que se dispara cuando un usuario abre la vista del chat
 * Este evento es informativo y se usa para:
 * - Notificar a otros usuarios que alguien está viendo el chat
 * - Tracking de actividad del usuario
 * - Actualizar indicadores de presencia
 */
export class ChatViewOpenedEvent extends DomainEvent<{
  view: ChatViewOpenedData;
}> {
  constructor(data: { view: ChatViewOpenedData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'chat.v2.view-opened';

  /**
   * Obtiene los datos de la apertura de vista
   */
  getViewData(): ChatViewOpenedData {
    return this.attributes.view;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.view.chatId;
  }

  /**
   * Obtiene el ID del usuario que abrió la vista
   */
  getUserId(): string {
    return this.attributes.view.userId;
  }

  /**
   * Obtiene el rol del usuario
   */
  getUserRole(): 'visitor' | 'commercial' {
    return this.attributes.view.userRole;
  }

  /**
   * Verifica si la vista fue abierta por un visitante
   */
  isVisitor(): boolean {
    return this.attributes.view.userRole === 'visitor';
  }

  /**
   * Verifica si la vista fue abierta por un comercial
   */
  isCommercial(): boolean {
    return this.attributes.view.userRole === 'commercial';
  }

  /**
   * Obtiene la fecha de apertura
   */
  getOpenedAt(): Date {
    return this.attributes.view.openedAt;
  }
}
