import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener los filtros guardados de un usuario
 */
export class GetSavedFiltersQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
  ) {}
}
