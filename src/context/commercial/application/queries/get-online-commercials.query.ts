import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener todos los comerciales online
 */
export class GetOnlineCommercialsQuery implements IQuery {
  constructor() {}
}
