import { IQuery } from '@nestjs/cqrs';

// Query para obtener los datos de un visitante por su ID
export class GetVisitorByIdQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
