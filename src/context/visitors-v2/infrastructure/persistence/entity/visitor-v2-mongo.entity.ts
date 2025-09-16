import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'visitors_v2' })
export class VisitorV2MongoEntity extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  siteId: string;

  @Prop({ required: true })
  fingerprint: string;

  @Prop({ required: true, enum: ['ANON', 'ENGAGED', 'LEAD', 'CONVERTED'] })
  lifecycle: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        startedAt: { type: Date, required: true },
        lastActivityAt: { type: Date, required: true },
        endedAt: { type: Date, default: null },
      },
    ],
    default: [],
  })
  sessions: Array<{
    id: string;
    startedAt: Date;
    lastActivityAt: Date;
    endedAt?: Date;
  }>;
}

export const VisitorV2MongoEntitySchema =
  SchemaFactory.createForClass(VisitorV2MongoEntity);

// Índices para optimizar consultas
VisitorV2MongoEntitySchema.index(
  { fingerprint: 1, siteId: 1 },
  { unique: true },
);
VisitorV2MongoEntitySchema.index({ tenantId: 1 });
VisitorV2MongoEntitySchema.index({ siteId: 1 });
VisitorV2MongoEntitySchema.index({ lifecycle: 1 });
VisitorV2MongoEntitySchema.index({ 'sessions.id': 1 });
VisitorV2MongoEntitySchema.index({ 'sessions.endedAt': 1 });
