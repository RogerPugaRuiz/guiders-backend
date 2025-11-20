import { DomainEvent } from 'src/context/shared/domain/domain-event';

// Evento de dominio que se emite cuando cambia el estado de conexión de un visitante
// Este evento permite que la infraestructura (Redis) sincronice el estado sin que el dominio conozca esos detalles
export class VisitorConnectionChangedEvent extends DomainEvent<{
  visitorId: string;
  previousConnection: string | null; // Estado anterior (null si es la primera conexión)
  newConnection: string; // Nuevo estado de conexión
  timestamp: string; // Momento del cambio
}> {}
