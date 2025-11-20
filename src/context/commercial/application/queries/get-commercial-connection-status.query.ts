import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener el estado de conexión de un comercial
 */
export class GetCommercialConnectionStatusQuery implements IQuery {
  constructor(public readonly commercialId: string) {}
}
