import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener un usuario por su ID
 */
export class FindUserByIdQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
