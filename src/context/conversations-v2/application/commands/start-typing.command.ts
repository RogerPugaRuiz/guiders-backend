import { ICommand } from '@nestjs/cqrs';

/**
 * Command para indicar que un usuario (comercial o visitante) está escribiendo en un chat
 */
export class StartTypingCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly userType: 'commercial' | 'visitor',
  ) {}
}
