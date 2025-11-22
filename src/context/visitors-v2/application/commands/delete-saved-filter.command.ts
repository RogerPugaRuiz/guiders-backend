import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para eliminar un filtro guardado
 */
export class DeleteSavedFilterCommand implements ICommand {
  constructor(
    public readonly filterId: string,
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
