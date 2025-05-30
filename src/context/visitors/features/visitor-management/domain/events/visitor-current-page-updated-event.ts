import { DomainEvent } from 'src/context/shared/domain/domain-event';

// Evento de dominio que representa la actualización de la página actual del visitante
export class VisitorCurrentPageUpdatedEvent extends DomainEvent<{
  visitorId: string;
  currentPage: string;
}> {}
