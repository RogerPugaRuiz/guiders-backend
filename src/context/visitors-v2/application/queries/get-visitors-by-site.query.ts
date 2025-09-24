import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener todos los visitantes de un sitio específico
 */
export class GetVisitorsBySiteQuery implements IQuery {
  constructor(
    readonly siteId: string,
    readonly includeOffline: boolean = false,
    readonly limit?: number,
    readonly offset?: number,
  ) {}

  static create(params: {
    siteId: string;
    includeOffline?: boolean;
    limit?: number;
    offset?: number;
  }): GetVisitorsBySiteQuery {
    return new GetVisitorsBySiteQuery(
      params.siteId,
      params.includeOffline ?? false,
      params.limit,
      params.offset,
    );
  }
}
