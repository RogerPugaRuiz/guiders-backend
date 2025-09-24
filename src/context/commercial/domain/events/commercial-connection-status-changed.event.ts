import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Evento de dominio emitido cuando el estado de conexión de un comercial cambia
 */
export class CommercialConnectionStatusChangedEvent extends DomainEvent<{
  commercialId: string;
  previousStatus: string;
  newStatus: string;
  changedAt: Date;
}> {}
