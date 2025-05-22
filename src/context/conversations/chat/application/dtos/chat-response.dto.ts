// DTO para la respuesta serializada de un chat
// Intención: Facilitar la serialización y tipado de la respuesta HTTP para el endpoint getChat
import { ChatPrimitives, ParticipantPrimitives } from '../../domain/chat/chat';

export class ChatResponseDto {
  id: string;
  participants: ParticipantPrimitives[];
  status: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;

  constructor(chat: ChatPrimitives) {
    // Asignación segura y tipada
    this.id = chat.id;
    this.participants = chat.participants;
    this.status = chat.status;
    this.lastMessage = chat.lastMessage;
    this.lastMessageAt = chat.lastMessageAt;
    this.createdAt = chat.createdAt;
  }
}
