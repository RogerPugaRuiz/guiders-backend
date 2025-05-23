import { ICommand } from '@nestjs/cqrs';

// Comando para actualizar el nombre de un visitante
export class UpdateVisitorNameCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly name: string,
  ) {}
}
