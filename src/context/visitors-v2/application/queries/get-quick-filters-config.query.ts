import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener la configuración de filtros rápidos con contadores
 */
export class GetQuickFiltersConfigQuery implements IQuery {
  constructor(public readonly tenantId: string) {}
}
