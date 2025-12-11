import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener el siteId de un visitante
 */
export class GetVisitorSiteQuery implements IQuery {
  constructor(public readonly visitorId: string) {}
}
