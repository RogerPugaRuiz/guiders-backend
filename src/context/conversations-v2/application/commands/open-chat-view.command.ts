import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para indicar que un usuario ha abierto la vista del chat
 * Este comando es ejecutado tanto por visitantes como por comerciales
 */
export class OpenChatViewCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly userRoles: string[],
    public readonly timestamp?: string,
  ) {}
}
