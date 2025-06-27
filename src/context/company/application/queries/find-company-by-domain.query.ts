// Query para buscar una empresa por su dominio
import { IQuery } from '@nestjs/cqrs';

export class FindCompanyByDomainQuery implements IQuery {
  constructor(public readonly domain: string) {}
}
