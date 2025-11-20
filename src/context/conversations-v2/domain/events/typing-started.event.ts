import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Evento de dominio que se dispara cuando un usuario empieza a escribir en un chat
 */
export class TypingStartedEvent extends DomainEvent<{
  chatId: string;
  userId: string;
  userType: 'commercial' | 'visitor';
}> {
  constructor(
    chatId: string,
    userId: string,
    userType: 'commercial' | 'visitor',
  ) {
    super({ chatId, userId, userType });
  }

  /**
   * Nombre del evento para identificación
   */
  static eventName = 'typing.started';

  /**
   * Obtiene el ID del chat
   */
  getChatId(): string {
    return this.attributes.chatId;
  }

  /**
   * Obtiene el ID del usuario
   */
  getUserId(): string {
    return this.attributes.userId;
  }

  /**
   * Obtiene el tipo de usuario (commercial o visitor)
   */
  getUserType(): 'commercial' | 'visitor' {
    return this.attributes.userType;
  }
}
