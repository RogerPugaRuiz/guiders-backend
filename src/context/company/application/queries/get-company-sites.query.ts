import { IQuery } from '@nestjs/cqrs';

export class GetCompanySitesQuery implements IQuery {
  constructor(public readonly companyId: string) {}
}
