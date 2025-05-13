import { Email } from 'src/context/shared/domain/value-objects/email';

// Objeto de valor para el email de la invitación
// Extiende de Email y aplica la validación de formato de email
export class InviteEmail extends Email {
  constructor(value: string) {
    super(value);
  }
}
