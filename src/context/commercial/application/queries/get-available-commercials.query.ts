import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener todos los comerciales disponibles (online y no busy)
 */
export class GetAvailableCommercialsQuery implements IQuery {
  constructor() {}
}
