/**
 * Comando para generar sugerencias de respuesta para comerciales
 */

export class GenerateSuggestionCommand {
  constructor(
    public readonly chatId: string,
    public readonly commercialId: string,
    public readonly companyId: string,
    public readonly lastMessageContent?: string,
  ) {}
}
