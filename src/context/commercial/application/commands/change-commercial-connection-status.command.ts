import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para cambiar el estado de conexión de un comercial
 */
export class ChangeCommercialConnectionStatusCommand implements ICommand {
  constructor(
    public readonly commercialId: string,
    public readonly newStatus: string,
  ) {}
}
