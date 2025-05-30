import { DomainEvent } from 'src/context/shared/domain/domain-event';
export class Payload {
  id: string;
  companyName: string;
  domains: string[];
  createdAt: string;
  updatedAt: string;
}

// Representa el evento de creación de una empresa
export class CompanyCreatedEvent extends DomainEvent<Payload> {
  constructor(payload: Payload) {
    super(payload);
  }
}
