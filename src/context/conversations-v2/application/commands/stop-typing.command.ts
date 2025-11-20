import { ICommand } from '@nestjs/cqrs';

/**
 * Command para indicar que un usuario (comercial o visitante) dejó de escribir en un chat
 */
export class StopTypingCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly userId: string,
    public readonly userType: 'commercial' | 'visitor',
  ) {}
}
