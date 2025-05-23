import { ICommand } from '@nestjs/cqrs';

// Comando para actualizar el teléfono de un visitante
export class UpdateVisitorTelCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly tel: string,
  ) {}
}
