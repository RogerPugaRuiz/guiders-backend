import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Objeto de valor para el identificador único del evento de tracking
// Valida que el valor sea un Uuid válido
export class TrackingEventId extends Uuid {
  constructor(value: string) {
    super(value);
  }
}
