import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VisitorSearchHistoryDocument = VisitorSearchHistory & Document;

@Schema({
  collection: 'visitor_search_history',
  timestamps: false,
})
export class VisitorSearchHistory {
  @Prop({ required: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  query: string;

  @Prop({ required: true })
  resultsCount: number;

  @Prop({ required: true, type: Date, index: true })
  executedAt: Date;
}

export const VisitorSearchHistorySchema = SchemaFactory.createForClass(
  VisitorSearchHistory,
);

// Índice compuesto para consultas por usuario y tenant
VisitorSearchHistorySchema.index({ userId: 1, tenantId: 1, executedAt: -1 });

// TTL index para limpiar historial después de 30 días
VisitorSearchHistorySchema.index(
  { executedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
