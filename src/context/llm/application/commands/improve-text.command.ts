/**
 * Comando para mejorar un texto haciéndolo más profesional pero manteniendo un tono humano
 */

export class ImproveTextCommand {
  constructor(
    public readonly text: string,
    public readonly userId: string,
    public readonly siteId: string,
  ) {}
}
