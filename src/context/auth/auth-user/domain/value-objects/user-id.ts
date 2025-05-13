import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Objeto de valor para el identificador único del usuario invitado
// Extiende de Uuid y aplica la validación UUID
export class UserId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  // Método de fábrica para crear un nuevo UserId aleatorio
  public static random(): UserId {
    return new UserId(Uuid.generate());
  }
}
