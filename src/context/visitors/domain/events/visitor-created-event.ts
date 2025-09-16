import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { VisitorPrimitives } from '../visitor.aggregate';

// Evento de dominio que representa la creación de un visitante
export class VisitorCreatedEvent extends DomainEvent<{
  visitor: VisitorPrimitives;
}> {}
