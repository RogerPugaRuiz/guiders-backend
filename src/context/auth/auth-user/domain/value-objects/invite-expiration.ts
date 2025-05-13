// Objeto de valor para la expiración de la invitación (Date ISO string)
// Valida que sea una fecha futura válida
import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

const validateInviteExpiration = (value: string) => {
  const date = new Date(value);
  return !isNaN(date.getTime()) && date > new Date();
};

export class InviteExpiration extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateInviteExpiration,
      'La expiración debe ser una fecha futura válida en formato ISO',
    );
  }
}
