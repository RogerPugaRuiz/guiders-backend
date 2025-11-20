import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener un comercial por su ID
 */
export class GetCommercialByIdQuery implements IQuery {
  constructor(public readonly commercialId: string) {}
}
