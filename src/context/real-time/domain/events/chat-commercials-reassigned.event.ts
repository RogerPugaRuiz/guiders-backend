import { ChatCommercialsAssignedEvent } from 'src/context/real-time/domain/events/chat-commercials-assigned.event';

/**
 * Evento específico para reasignación de comerciales
 * Se diferencia del evento normal de asignación porque implica limpiar comerciales anteriores
 */
export class ChatCommercialsReassignedEvent extends ChatCommercialsAssignedEvent {
  constructor(chatId: string, commercialIds: string[]) {
    super(chatId, commercialIds);
  }

  public static create(chatId: string, commercialIds: string[]): ChatCommercialsReassignedEvent {
    return new ChatCommercialsReassignedEvent(chatId, commercialIds);
  }
}
