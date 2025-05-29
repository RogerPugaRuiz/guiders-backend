// DTO para la respuesta de lista de IDs de chats
// Intención: Facilitar la serialización y tipado de la respuesta HTTP para el endpoint getChatIds
export class ChatIdsResponseDto {
  chatIds: string[];

  constructor(chatIds: string[]) {
    this.chatIds = chatIds;
  }
}
