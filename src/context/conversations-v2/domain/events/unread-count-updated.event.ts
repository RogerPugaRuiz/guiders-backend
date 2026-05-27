import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Evento de dominio que se dispara cuando el contador de mensajes no leídos de un chat
 * ha sido actualizado de forma atómica en la base de datos.
 *
 * Este evento transporta el nuevo valor confirmado, eliminando la necesidad de
 * que otros handlers realicen una query adicional para obtenerlo.
 */
export class UnreadCountUpdatedEvent extends DomainEvent<{
  chatId: string;
  newCount: number;
}> {
  constructor(data: { chatId: string; newCount: number }) {
    super(data);
  }

  static eventName = 'chat.v2.unread_count_updated';

  getChatId(): string {
    return this.attributes.chatId;
  }

  getNewCount(): number {
    return this.attributes.newCount;
  }
}
