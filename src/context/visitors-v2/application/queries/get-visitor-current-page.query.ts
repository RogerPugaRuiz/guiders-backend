import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener la página actual de un visitante
 */
export class GetVisitorCurrentPageQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
