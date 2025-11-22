import { ICommand } from '@nestjs/cqrs';
import { VisitorFiltersDto, VisitorSortDto } from '../dtos/visitor-filters.dto';

/**
 * Comando para guardar un filtro personalizado
 */
export class SaveFilterCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly filters: VisitorFiltersDto,
    public readonly sort: VisitorSortDto | undefined,
  ) {}
}
