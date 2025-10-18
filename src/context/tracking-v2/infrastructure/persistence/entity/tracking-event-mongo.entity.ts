import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Esquema MongoDB para TrackingEvent V2
 * Usa collections particionadas por mes (tracking_events_YYYY_MM)
 */
@Schema({
  // La collection será dinámica según la fecha
  // tracking_events_2025_01, tracking_events_2025_02, etc.
  timestamps: false, // No usamos timestamps de Mongoose, tenemos occurredAt
  toJSON: {
    transform: (_doc: any, ret: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      ret.id = ret._id?.toString();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.__v;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return ret;
    },
  },
})
export class TrackingEventMongoEntity {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  visitorId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  sessionId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  tenantId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  siteId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  eventType: string;

  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  metadata: Record<string, any>;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  occurredAt: Date;

  @Prop({
    type: Number,
    required: true,
    default: 1,
  })
  count: number;
}

export type TrackingEventDocument = HydratedDocument<TrackingEventMongoEntity>;
export const TrackingEventMongoEntitySchema = SchemaFactory.createForClass(
  TrackingEventMongoEntity,
);

// Índices compuestos para optimizar consultas frecuentes
// Consultas por visitante ordenadas por fecha
TrackingEventMongoEntitySchema.index({ visitorId: 1, occurredAt: -1 });

// Consultas por sesión ordenadas por fecha
TrackingEventMongoEntitySchema.index({ sessionId: 1, occurredAt: -1 });

// Consultas por tenant y tipo de evento
TrackingEventMongoEntitySchema.index({
  tenantId: 1,
  eventType: 1,
  occurredAt: -1,
});

// Consultas por sitio
TrackingEventMongoEntitySchema.index({ siteId: 1, occurredAt: -1 });

// Consultas por tipo de evento
TrackingEventMongoEntitySchema.index({ eventType: 1, occurredAt: -1 });

// Consultas por rango de fechas (TTL automático si se implementa)
TrackingEventMongoEntitySchema.index({ occurredAt: 1 });

// Índice compuesto para estadísticas
TrackingEventMongoEntitySchema.index({
  tenantId: 1,
  siteId: 1,
  occurredAt: -1,
});

// Índice para agregaciones por visitante
TrackingEventMongoEntitySchema.index({
  visitorId: 1,
  sessionId: 1,
  eventType: 1,
});
