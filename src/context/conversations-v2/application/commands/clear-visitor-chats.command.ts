import { ICommand } from '@nestjs/cqrs';

/**
 * Command para eliminar todos los chats de un visitante
 */
export class ClearVisitorChatsCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly deletedBy: string,
  ) {}
}

export interface ClearVisitorChatsResult {
  visitorId: string;
  deletedCount: number;
}
