import { IEvent } from '@nestjs/cqrs';

/**
 * Evento que se dispara cuando un comercial registra un nuevo fingerprint
 * Permite a otros contextos reaccionar (ej: marcar visitantes como internos)
 */
export class CommercialFingerprintRegisteredEvent implements IEvent {
  constructor(
    public readonly commercialId: string,
    public readonly fingerprint: string,
    public readonly registeredAt: Date = new Date(),
  ) {}
}
