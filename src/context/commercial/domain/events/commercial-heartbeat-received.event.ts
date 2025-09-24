import { DomainEvent } from 'src/context/shared/domain/domain-event';

/**
 * Evento de dominio emitido cuando un comercial envía un heartbeat
 */
export class CommercialHeartbeatReceivedEvent extends DomainEvent<{
  commercialId: string;
  lastActivity: Date;
  connectionStatus: string;
}> {}
