import { UUID } from 'src/context/shared/domain/value-objects/uuid';

// Objeto de valor para el identificador único del evento de tracking
// Valida que el valor sea un UUID válido
export class TrackingEventId extends UUID {
  constructor(value: string) {
    super(value);
  }
}
