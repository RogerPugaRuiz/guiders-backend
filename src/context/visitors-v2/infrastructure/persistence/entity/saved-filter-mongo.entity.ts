import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SavedFilterDocument = SavedFilterMongoEntity & Document;

/**
 * Entidad MongoDB para filtros guardados
 */
@Schema({
  collection: 'saved_filters',
  timestamps: false,
  versionKey: false,
})
export class SavedFilterMongoEntity {
  @Prop({ required: true, type: String })
  id: string;

  @Prop({ required: true, type: String, index: true })
  userId: string;

  @Prop({ required: true, type: String, index: true })
  tenantId: string;

  @Prop({ required: true, type: String })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ required: true, type: Object })
  filters: Record<string, unknown>;

  @Prop({ type: Object, default: null })
  sort: Record<string, unknown> | null;

  @Prop({ required: true, type: Date })
  createdAt: Date;

  @Prop({ required: true, type: Date })
  updatedAt: Date;
}

export const SavedFilterMongoEntitySchema = SchemaFactory.createForClass(
  SavedFilterMongoEntity,
);

// Índices
SavedFilterMongoEntitySchema.index({ id: 1 }, { unique: true });
SavedFilterMongoEntitySchema.index({ userId: 1, tenantId: 1 });
SavedFilterMongoEntitySchema.index({ tenantId: 1 });
