/**
 * Command para marcar mensajes como leídos
 */
export class MarkMessagesAsReadCommand {
  constructor(
    public readonly messageIds: string[],
    public readonly readBy: string,
    public readonly userRoles: string[],
  ) {}
}
