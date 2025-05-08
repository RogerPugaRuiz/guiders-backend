import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Objeto de valor para el identificador único del visitante
// Valida que el valor sea un Uuid válido
export class VisitorId extends Uuid {
  constructor(value: string) {
    super(value);
  }
}
