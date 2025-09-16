// Query para resolver un sitio por su host/dominio
import { IQuery } from '@nestjs/cqrs';

export class ResolveSiteByHostQuery implements IQuery {
  constructor(public readonly host: string) {}
}
