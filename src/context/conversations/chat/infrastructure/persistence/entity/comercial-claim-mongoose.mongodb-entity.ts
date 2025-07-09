import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ComercialClaimDocument = ComercialClaimMongooseEntity & Document;

@Schema({ collection: 'comercial_claims' })
export class ComercialClaimMongooseEntity {
  @Prop({ required: true, type: String })
  _id: string;

  @Prop({ required: true, type: String, index: true })
  chat_id: string;

  @Prop({ required: true, type: String, index: true })
  comercial_id: string;

  @Prop({ required: true, type: Date })
  claimed_at: Date;

  @Prop({ required: false, type: Date, default: null })
  released_at: Date | null;

  @Prop({ required: true, type: String, index: true })
  status: string;
}

export const ComercialClaimMongooseSchema = SchemaFactory.createForClass(
  ComercialClaimMongooseEntity,
);

// Índices para optimizar consultas
ComercialClaimMongooseSchema.index({ chat_id: 1, status: 1 });
ComercialClaimMongooseSchema.index({ comercial_id: 1, status: 1 });
ComercialClaimMongooseSchema.index({ status: 1 });
