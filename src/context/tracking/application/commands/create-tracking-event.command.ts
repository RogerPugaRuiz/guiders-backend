import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para crear un nuevo TrackingEvent.
 * Todas las propiedades requeridas se agrupan en el objeto 'params' para mantener la consistencia y claridad.
 */
export class CreateTrackingEventCommand implements ICommand {
  /**
   * Contiene los datos necesarios para crear un TrackingEvent.
   * - id: Identificador único del evento (string, UUID)
   * - visitorId: Identificador del visitante (string)
   * - eventType: Tipo de evento (string)
   * - metadata: Información adicional del evento (Record<string, any>)
   * - occurredAt: Fecha y hora en que ocurrió el evento (Date, opcional)
   */
  public readonly params: {
    id: string;
    visitorId: string;
    eventType: string;
    metadata: Record<string, any>;
    occurredAt?: Date;
  };

  constructor(params: {
    id: string;
    visitorId: string;
    eventType: string;
    metadata: Record<string, any>;
    occurredAt?: Date;
  }) {
    this.params = params;
  }
}
