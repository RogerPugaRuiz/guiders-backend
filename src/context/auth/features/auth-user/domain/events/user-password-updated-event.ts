import { IEvent } from '@nestjs/cqrs';

// Evento de dominio que indica que la contraseña del usuario fue actualizada
export class UserPasswordUpdatedEvent implements IEvent {
  // Se expone el id del usuario para trazabilidad
  constructor(public readonly userId: string) {}
}
