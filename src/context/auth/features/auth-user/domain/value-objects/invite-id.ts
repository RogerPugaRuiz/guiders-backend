import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Objeto de valor para el identificador único de la invitación
// Extiende de Uuid y aplica la validación UUID
export class InviteId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  // Método de fábrica para crear un nuevo InviteId aleatorio
  public static random(): InviteId {
    return new InviteId(Uuid.generate());
  }
}
