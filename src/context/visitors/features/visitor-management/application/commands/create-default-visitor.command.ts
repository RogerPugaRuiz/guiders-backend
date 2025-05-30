import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para crear un visitante por defecto asociado a una cuenta de visitante
 */
export class CreateDefaultVisitorCommand implements ICommand {
  constructor(public readonly visitorAccountId: string) {}
}
