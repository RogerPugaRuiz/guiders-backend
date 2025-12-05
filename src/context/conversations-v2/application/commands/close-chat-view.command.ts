import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para indicar que un usuario ha cerrado la vista del chat
 * Este comando es ejecutado tanto por visitantes como por comerciales
 */
export class CloseChatViewCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly userRole: 'visitor' | 'commercial',
    public readonly timestamp?: string,
  ) {}
}
