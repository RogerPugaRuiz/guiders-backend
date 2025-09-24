import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Evento de dominio emitido cuando un comercial se conecta al sistema
 */
export class CommercialConnectedEvent extends DomainEvent<{
  commercialId: string;
  name: string;
  connectionStatus: string;
  connectedAt: Date;
}> {}
