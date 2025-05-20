import { Column, Entity, PrimaryColumn } from 'typeorm';

// Entidad de infraestructura para persistencia de eventos de tracking.
// Refleja la estructura de la entidad de dominio TrackingEvent, pero sin lógica de dominio.
@Entity('tracking_events')
export class TrackingEventTypeOrmEntity {
  // Identificador único del evento de tracking
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  // Identificador del visitante asociado al evento
  @Column({ type: 'uuid' })
  visitorId: string;

  // Tipo de evento registrado
  @Column({ type: 'varchar', length: 100 })
  eventType: string;

  // Metadatos adicionales del evento, almacenados como JSONB
  @Column({ type: 'jsonb' })
  metadata: Record<string, any>;

  // Fecha y hora en que ocurrió el evento
  @Column({ type: 'timestamptz' })
  occurredAt: Date;
}
