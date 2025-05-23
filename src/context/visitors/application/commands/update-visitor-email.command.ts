import { ICommand } from '@nestjs/cqrs';

// Comando para actualizar el email de un visitante
export class UpdateVisitorEmailCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly email: string,
  ) {}
}
