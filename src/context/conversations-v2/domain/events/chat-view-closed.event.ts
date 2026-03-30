import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Datos del evento de cierre de vista del chat
 */
export interface ChatViewClosedData {
  chatId: string;
  userId: string;
  userRole: 'visitor' | 'commercial';
  closedAt: Date;
}

/**
 * Evento de dominio que se dispara cuando un usuario cierra la vista del chat
 * Este evento es informativo y se usa para:
 * - Notificar a otros usuarios que alguien dejó de ver el chat
 * - Tracking de actividad del usuario
 * - Actualizar indicadores de presencia
 */
export class ChatViewClosedEvent extends DomainEvent<{
  view: ChatViewClosedData;
}> {
  constructor(data: { view: ChatViewClosedData }) {
    super(data);
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'chat.v2.view-closed';

  /**
   * Obtiene los datos del cierre de vista
   */
  getViewData(): ChatViewClosedData {
    return this.attributes.view;
  }

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.view.chatId;
  }

  /**
   * Obtiene el ID del usuario que cerró la vista
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
   * Verifica si la vista fue cerrada por un visitante
   */
  isVisitor(): boolean {
    return this.attributes.view.userRole === 'visitor';
  }

  /**
   * Verifica si la vista fue cerrada por un comercial
   */
  isCommercial(): boolean {
    return this.attributes.view.userRole === 'commercial';
  }

  /**
   * Obtiene la fecha de cierre
   */
  getClosedAt(): Date {
    return this.attributes.view.closedAt;
  }
}
