import { IEvent } from '@nestjs/cqrs';

/**
 * Evento de dominio emitido cuando se actualiza un filtro guardado
 */
export class SavedFilterUpdatedEvent implements IEvent {
  constructor(
    public readonly payload: {
      id: string;
      userId: string;
      tenantId: string;
      updatedFields: string[];
      updatedAt: string;
    },
  ) {}
}
