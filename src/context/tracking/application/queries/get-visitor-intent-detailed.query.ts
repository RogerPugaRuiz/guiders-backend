import { IQuery } from '@nestjs/cqrs';

// Query para obtener la intención detallada de un visitante
export class GetVisitorIntentDetailedQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
