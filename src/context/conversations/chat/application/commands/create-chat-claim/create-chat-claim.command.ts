/**
 * Comando para crear un claim de chat
 */
export class CreateChatClaimCommand {
  constructor(
    public readonly chatId: string,
    public readonly comercialId: string,
  ) {}
}
