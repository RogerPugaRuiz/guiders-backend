import { DomainEvent } from 'src/context/shared/domain/domain-event';

// Evento de dominio que representa la creación de una invitación
export class InviteCreatedEvent extends DomainEvent<{
  inviteId: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
}> {
  // El payload contiene los datos relevantes de la invitación
  constructor(
    public readonly payload: {
      inviteId: string;
      userId: string;
      email: string;
      token: string;
      expiresAt: string;
    },
    // La fecha de creación del evento se establece en el momento actual
  ) {
    super(payload);
  }
}
