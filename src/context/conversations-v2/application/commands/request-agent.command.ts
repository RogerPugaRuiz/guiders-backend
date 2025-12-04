import { ICommand } from '@nestjs/cqrs';

/**
 * Command para solicitar atención de un agente humano
 * Este command se ejecuta cuando el visitante quiere hablar con un comercial
 */
export class RequestAgentCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
    public readonly timestamp?: string,
    public readonly source?: string,
  ) {}
}
