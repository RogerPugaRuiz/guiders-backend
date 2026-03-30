/**
 * Comando para generar una respuesta de IA
 */

export class GenerateAIResponseCommand {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
    public readonly companyId: string,
    public readonly triggerMessageId: string,
  ) {}
}
