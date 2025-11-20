import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para cambiar el estado de conexión de un visitante manualmente
 */
export class ChangeVisitorConnectionStatusCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly newStatus: string,
  ) {}
}
