import { IQuery } from '@nestjs/cqrs';

export class FindCommercialChatsQuery implements IQuery {
  constructor(readonly commercialId: string) {}
}
