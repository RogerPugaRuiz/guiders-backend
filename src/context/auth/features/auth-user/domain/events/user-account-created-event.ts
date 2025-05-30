import { DomainEvent } from 'src/context/shared/domain/domain-event';
import { UserAccountPrimitives } from '../user-account';

// Evento de dominio que indica que se ha creado un nuevo usuario
export class UserAccountCreatedEvent extends DomainEvent<{
  user: UserAccountPrimitives;
}> {}
