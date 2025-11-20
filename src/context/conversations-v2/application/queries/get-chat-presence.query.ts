import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener el estado de presencia de los participantes de un chat
 */
export class GetChatPresenceQuery implements IQuery {
  constructor(public readonly chatId: string) {}
}
