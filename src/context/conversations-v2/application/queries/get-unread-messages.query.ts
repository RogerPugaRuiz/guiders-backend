/**
 * Query para obtener mensajes no leídos de un chat
 */
export class GetUnreadMessagesQuery {
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly userRoles: string[],
  ) {}
}
