import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VisitorSavedSearchDocument = VisitorSavedSearch & Document;

@Schema({
  collection: 'visitor_saved_searches',
  timestamps: true,
})
export class VisitorSavedSearch {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  query: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: true, type: Date })
  createdAt: Date;
}

export const VisitorSavedSearchSchema =
  SchemaFactory.createForClass(VisitorSavedSearch);

// Índice compuesto para consultas por usuario y tenant
VisitorSavedSearchSchema.index({ userId: 1, tenantId: 1, createdAt: -1 });
