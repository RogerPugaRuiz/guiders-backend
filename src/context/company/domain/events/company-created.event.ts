import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { SitePrimitives } from '../entities/site';

export class Payload {
  id: string;
  companyName: string;
  sites: SitePrimitives[];
  createdAt: string;
  updatedAt: string;
}

// Representa el evento de creación de una empresa
export class CompanyCreatedEvent extends DomainEvent<Payload> {
  constructor(payload: Payload) {
    super(payload);
  }
}
