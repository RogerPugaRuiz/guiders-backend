import { IQuery } from '@nestjs/cqrs';

// Query para obtener la intención actual de un visitante
export class GetCurrentVisitorIntentQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
