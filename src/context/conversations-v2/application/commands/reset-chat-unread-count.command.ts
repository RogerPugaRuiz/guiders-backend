/**
 * Comando para resetear a 0 el contador de mensajes no leídos de un chat.
 * Se debe llamar cuando un comercial abre/lee el chat para que el badge
 * del sidebar y la columna de actividad se actualicen correctamente.
 */
export class ResetChatUnreadCountCommand {
  constructor(
    public readonly chatId: string,
    public readonly requestedBy: string,
    public readonly companyId: string,
  ) {}
}
