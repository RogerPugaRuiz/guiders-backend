import { DomainError } from 'src/context/shared/domain/domain.error';

// Error de dominio para operaciones de persistencia de Invite
export class InvitePersistenceError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

// Error de dominio para cuando no se encuentra una invitación
export class InviteNotFoundError extends DomainError {
  constructor() {
    super('Invite no encontrado');
  }
}
