// Objeto de valor para el token de invitación
// Valida que el token sea un string no vacío
import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

const validateInviteToken = (value: string) =>
  typeof value === 'string' && value.trim().length > 0;

export class InviteToken extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateInviteToken,
      'El token de invitación no puede estar vacío',
    );
  }
}
